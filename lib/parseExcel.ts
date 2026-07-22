import * as XLSX from "xlsx";
import {
  type Grade,
  type ParseResult,
  type Student,
  type SubjectKey,
  SUBJECT_KEYS,
  PASS_GRADES,
  ALL_GRADES,
} from "./types";

const GRADE_SET = new Set<string>(["A", "B", "C", "S", "W"]);

/**
 * Extract O/L grade from DoE result cells.
 *
 * Official patterns (examples from results register):
 *   "21 B 2"   → B   (code + grade + syllabus, spaced)
 *   "21B2"     → B   (compact)
 *   "11BA 2"   → A   (code + medium B/E/S/T + grade + syllabus)
 *   "34EA 2"   → A
 *   "60EC 2"   → C
 *   "33SS 1"   → S
 *   "46 W 3"   → W
 *   "41 C 3"   → C
 */
export function extractGrade(cell: unknown): Grade | null {
  if (cell == null || cell === "") return null;

  // Preserve string form; Excel may store numeric-looking codes as numbers
  let raw = typeof cell === "number" ? String(cell) : String(cell);
  raw = raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  if (!raw || raw === "-" || raw === "—" || raw === "N/A") return null;

  // Standalone grade letter
  if (GRADE_SET.has(raw)) return raw as Grade;

  // 1) Spaced: "21 B 2" / "46 W 3" / "41 C 3"
  let m = raw.match(/^(\d{1,3})\s+([ABCSW])\s+(\d)\s*$/);
  if (m) return m[2] as Grade;

  // 2) Code + medium (E/S/T/B) + grade: "11BA 2", "34EA2", "33SS 1", "11B A 2"
  //    Require TWO letters so "21B2" is not misread as medium=B with no grade.
  m = raw.match(/^(\d{2,3})([ESTB])\s*([ABCSW])\s*(\d)\s*$/);
  if (m) return m[3] as Grade;

  // 3) Code + grade only: "21B2", "31A1", "46W3"
  m = raw.match(/^(\d{2,3})\s*([ABCSW])\s*(\d)\s*$/);
  if (m) return m[2] as Grade;

  // 4) Grade immediately before a trailing single syllabus digit (last resort)
  m = raw.match(/([ABCSW])\s*(\d)\s*$/);
  if (m) return m[1] as Grade;

  // 5) Any lone grade token in the string
  const tokens = raw.match(/\b([ABCSW])\b/g);
  if (tokens?.length === 1) return tokens[0] as Grade;

  return null;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function rowText(row: unknown[]): string {
  return row.map(normalizeHeader).filter(Boolean).join("|");
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const joined = rowText(rows[i]);
    if (
      joined.includes("NAME") &&
      (joined.includes("INDEX") ||
        joined.includes("GENDER") ||
        joined.includes("CANDIDATE"))
    ) {
      return i;
    }
  }
  return -1;
}

/** Detect sub-header row with A B C S W grade-count labels */
function findGradeCountStart(
  rows: unknown[][],
  headerIdx: number,
  subjectEndHint: number,
): number | null {
  for (let r = headerIdx; r <= Math.min(headerIdx + 2, rows.length - 1); r++) {
    const row = rows[r];
    for (let c = Math.max(0, subjectEndHint - 2); c < row.length - 4; c++) {
      const a = normalizeHeader(row[c]);
      const b = normalizeHeader(row[c + 1]);
      const d = normalizeHeader(row[c + 2]);
      const s = normalizeHeader(row[c + 3]);
      const w = normalizeHeader(row[c + 4]);
      if (a === "A" && b === "B" && d === "C" && s === "S" && w === "W") {
        return c;
      }
    }
  }
  return null;
}

interface ColumnMap {
  name: number;
  attemptNo: number;
  gender: number;
  medium: number;
  indexNumber: number;
  subjects: number[]; // length 9
  countA: number;
  countB: number;
  countC: number;
  countS: number;
  countW: number;
}

/**
 * Map columns for DoE Results Register.
 * Preferred layout after INDEX: 9 subject columns, then A B C S W counts.
 */
function resolveColumns(rows: unknown[][], headerIdx: number): ColumnMap | null {
  const header = rows[headerIdx];
  const next = rows[headerIdx + 1] ?? [];
  const merged = header.map((c, i) => {
    const a = normalizeHeader(c);
    const b = normalizeHeader(next[i]);
    return [a, b].filter(Boolean).join(" ");
  });

  const find = (...preds: ((h: string, idx: number) => boolean)[]): number => {
    for (let i = 0; i < merged.length; i++) {
      const h = merged[i];
      if (!h) continue;
      if (preds.some((p) => p(h, i))) return i;
    }
    return -1;
  };

  let name = find(
    (h) => h.includes("NAME") && h.includes("CANDIDATE"),
    (h) => h.startsWith("NAME OF"),
    (h) => h === "NAME",
  );
  let attemptNo = find((h) => h.includes("ATTEMPT"));
  let gender = find((h) => h.includes("GENDER") || h === "SEX");
  let medium = find((h) => h.includes("MEDIUM"));
  let indexNumber = find((h) => h.includes("INDEX"));

  // Positional fallback for standard DoE register (cols 0–4)
  if (name < 0) name = 0;
  if (attemptNo < 0) attemptNo = 1;
  if (gender < 0) gender = 2;
  if (medium < 0) medium = 3;
  if (indexNumber < 0) {
    // Prefer column whose data looks like an 8-digit index
    indexNumber = 4;
    for (let i = 0; i < Math.min(merged.length, 8); i++) {
      const sample = rows[headerIdx + 1]?.[i] ?? rows[headerIdx + 2]?.[i];
      if (/^\d{7,9}$/.test(String(sample ?? "").trim())) {
        indexNumber = i;
        break;
      }
    }
  }

  // Subject columns: prefer named headers, else INDEX+1 .. INDEX+9
  const namedSubjectIdx: Partial<Record<SubjectKey, number>> = {};
  merged.forEach((h, idx) => {
    if (!h) return;
    if (h.includes("RELIGION")) namedSubjectIdx.religion = idx;
    else if (h.includes("LANGUAGE") && h.includes("LITERATURE"))
      namedSubjectIdx.languageLiterature = idx;
    else if (h.includes("ENGLISH")) namedSubjectIdx.english = idx;
    else if (h.includes("SCIENCE")) namedSubjectIdx.science = idx;
    else if (h.includes("MATHEMATICS") || h.includes("MATHS"))
      namedSubjectIdx.mathematics = idx;
    else if (h.includes("HISTORY")) namedSubjectIdx.history = idx;
    else if (/\b1ST\b|\bFIRST\b/.test(h)) namedSubjectIdx.subjectGroup1 = idx;
    else if (/\b2ND\b|\bSECOND\b/.test(h)) namedSubjectIdx.subjectGroup2 = idx;
    else if (/\b3RD\b|\bTHIRD\b/.test(h)) namedSubjectIdx.subjectGroup3 = idx;
  });

  // Numbered subject headers "1", "2", … on header or next row
  const numbered: number[] = [];
  for (let n = 1; n <= 9; n++) {
    const hit = merged.findIndex(
      (h, idx) =>
        idx > indexNumber &&
        (h === String(n) ||
          h.startsWith(`${n} `) ||
          h.startsWith(`${n}-`) ||
          new RegExp(`^${n}\\b`).test(h)),
    );
    if (hit >= 0) numbered.push(hit);
  }

  let subjects: number[];
  if (SUBJECT_KEYS.every((k) => namedSubjectIdx[k] != null)) {
    subjects = SUBJECT_KEYS.map((k) => namedSubjectIdx[k]!);
  } else if (numbered.length === 9) {
    subjects = numbered;
  } else {
    // Canonical DoE layout: 9 subjects immediately after INDEX
    subjects = Array.from({ length: 9 }, (_, i) => indexNumber + 1 + i);
  }

  // Grade-count columns A B C S W
  let countStart = findGradeCountStart(
    rows,
    headerIdx,
    subjects[subjects.length - 1] + 1,
  );
  if (countStart == null) {
    // Immediately after last subject column
    countStart = subjects[subjects.length - 1] + 1;
  }

  return {
    name,
    attemptNo,
    gender,
    medium,
    indexNumber,
    subjects,
    countA: countStart,
    countB: countStart + 1,
    countC: countStart + 2,
    countS: countStart + 3,
    countW: countStart + 4,
  };
}

function cellRaw(row: unknown[], idx: number | undefined): unknown {
  if (idx == null || idx < 0 || idx >= row.length) return "";
  return row[idx];
}

function cellStr(row: unknown[], idx: number | undefined): string {
  const v = cellRaw(row, idx);
  if (v == null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    // Avoid scientific notation for index numbers
    return Number.isInteger(v) ? String(Math.trunc(v)) : String(v);
  }
  return String(v).replace(/\u00a0/g, " ").trim();
}

function toCount(row: unknown[], idx: number): number {
  const v = cellRaw(row, idx);
  if (v == null || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.round(v));
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function countFromSubjects(
  subjects: Partial<Record<SubjectKey, Grade | null>>,
): Record<Grade, number> {
  const counts: Record<Grade, number> = { A: 0, B: 0, C: 0, S: 0, W: 0 };
  for (const g of Object.values(subjects)) {
    if (g && ALL_GRADES.includes(g)) counts[g] += 1;
  }
  return counts;
}

function isDataRow(name: string, indexNumber: string): boolean {
  if (!name && !indexNumber) return false;
  const upper = name.toUpperCase();
  if (
    !name ||
    upper.includes("NAME OF THE CANDIDATE") ||
    upper.includes("DEPARTMENT OF") ||
    upper.includes("RESULTS REGISTER") ||
    upper.includes("GRADE COUNT") ||
    /^TOTAL\b/.test(upper) ||
    upper === "A" ||
    upper === "B"
  ) {
    return false;
  }
  // Prefer rows with a plausible index (7–9 digits)
  if (indexNumber && /^\d{7,9}$/.test(indexNumber)) return true;
  // Allow name-only rows if name looks like a person (has letters, long enough)
  if (/[A-ZА-Я]{3,}/i.test(name) && name.length >= 5 && !/^\d+$/.test(name)) {
    return true;
  }
  return false;
}

function buildStudent(row: unknown[], cols: ColumnMap, rowIndex: number): Student | null {
  const name = cellStr(row, cols.name);
  const indexNumber = cellStr(row, cols.indexNumber);
  if (!isDataRow(name, indexNumber)) return null;

  const subjects: Student["subjects"] = {};
  const rawSubjects: Student["rawSubjects"] = {};
  let passCount = 0;
  let failCount = 0;

  SUBJECT_KEYS.forEach((key, i) => {
    const raw = cellStr(row, cols.subjects[i]);
    rawSubjects[key] = raw;
    const grade = extractGrade(cellRaw(row, cols.subjects[i]));
    subjects[key] = grade;
    if (grade) {
      if (PASS_GRADES.includes(grade)) passCount += 1;
      else if (grade === "W") failCount += 1;
    }
  });

  // Always derive grade counts from parsed subject grades (source of truth)
  const gradeCount = countFromSubjects(subjects);

  // If sheet grade-count columns disagree, keep derived counts (more reliable for analysis)
  // Sheet values are only used when we extracted zero grades but sheet has counts
  // (e.g. subject cells unreadable) — then fall back to sheet totals.
  const derivedTotal =
    gradeCount.A + gradeCount.B + gradeCount.C + gradeCount.S + gradeCount.W;
  if (derivedTotal === 0) {
    const sheetCounts = {
      A: toCount(row, cols.countA),
      B: toCount(row, cols.countB),
      C: toCount(row, cols.countC),
      S: toCount(row, cols.countS),
      W: toCount(row, cols.countW),
    };
    const sheetTotal =
      sheetCounts.A +
      sheetCounts.B +
      sheetCounts.C +
      sheetCounts.S +
      sheetCounts.W;
    if (sheetTotal > 0) {
      Object.assign(gradeCount, sheetCounts);
      passCount = sheetCounts.A + sheetCounts.B + sheetCounts.C + sheetCounts.S;
      failCount = sheetCounts.W;
    }
  }

  const genderRaw = cellStr(row, cols.gender).toUpperCase();
  const gender =
    genderRaw === "F" || genderRaw.startsWith("F")
      ? "F"
      : genderRaw === "M" || genderRaw.startsWith("M")
        ? "M"
        : genderRaw || "-";

  return {
    id: indexNumber || `row-${rowIndex}`,
    name: name || "Unknown",
    attemptNo: cellStr(row, cols.attemptNo) || "1",
    gender,
    medium: cellStr(row, cols.medium) || "-",
    indexNumber: indexNumber || "-",
    subjects,
    rawSubjects,
    gradeCount,
    passCount,
    failCount,
    isOverallPass: passCount >= 6,
  };
}

function extractMeta(rows: unknown[][]): { schoolName: string; examTitle: string } {
  let schoolName = "Defence Services College";
  let examTitle = "G.C.E. (Ordinary Level) Examination";

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const line = rows[i]
      .map((c) => String(c ?? "").trim())
      .filter(Boolean)
      .join(" ");
    if (/G\.?C\.?E/i.test(line) || /ORDINARY LEVEL/i.test(line)) {
      examTitle = line.slice(0, 140);
    }
    if (/DEFENCE|SCHOOL\s*:/i.test(line) && line.length < 160) {
      schoolName =
        line
          .replace(/^.*SCHOOL\s*:?\s*/i, "")
          .replace(/\s*School\/Town.*$/i, "")
          .trim() || schoolName;
    }
  }

  return { schoolName, examTitle };
}

function dataStartRow(
  rows: unknown[][],
  headerIdx: number,
  cols: ColumnMap,
): number {
  // Skip sub-header rows (A B C S W labels, blank name)
  for (let r = headerIdx + 1; r < Math.min(headerIdx + 4, rows.length); r++) {
    const name = cellStr(rows[r], cols.name);
    const index = cellStr(rows[r], cols.indexNumber);
    if (isDataRow(name, index)) return r;
  }
  return headerIdx + 1;
}

/**
 * Parse Department of Examinations O/L results register (.xlsx / .xls).
 */
export function parseResultsWorkbook(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    raw: true,
  });
  const warnings: string[] = [];
  const students: Student[] = [];
  const seenIndexes = new Set<string>();

  let schoolName = "Defence Services College";
  let examTitle = "G.C.E. (Ordinary Level) Examination";

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // raw:true keeps numbers; we stringify carefully in cellStr
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
      blankrows: false,
    });

    if (!rows.length) continue;

    const meta = extractMeta(rows);
    schoolName = meta.schoolName;
    examTitle = meta.examTitle;

    const headerIdx = findHeaderRow(rows);
    if (headerIdx < 0) {
      warnings.push(`Could not find header row in sheet "${sheetName}".`);
      continue;
    }

    const cols = resolveColumns(rows, headerIdx);
    if (!cols) {
      warnings.push(`Could not map columns in sheet "${sheetName}".`);
      continue;
    }

    const start = dataStartRow(rows, headerIdx, cols);
    let mismatch = 0;

    for (let r = start; r < rows.length; r++) {
      const student = buildStudent(rows[r], cols, r);
      if (!student) continue;

      // Deduplicate by index within workbook
      if (student.indexNumber !== "-" && seenIndexes.has(student.indexNumber)) {
        continue;
      }
      if (student.indexNumber !== "-") seenIndexes.add(student.indexNumber);

      // Validate against sheet grade-count columns when present
      const sheetTotal =
        toCount(rows[r], cols.countA) +
        toCount(rows[r], cols.countB) +
        toCount(rows[r], cols.countC) +
        toCount(rows[r], cols.countS) +
        toCount(rows[r], cols.countW);
      const derivedTotal =
        student.gradeCount.A +
        student.gradeCount.B +
        student.gradeCount.C +
        student.gradeCount.S +
        student.gradeCount.W;
      if (
        sheetTotal > 0 &&
        derivedTotal > 0 &&
        (toCount(rows[r], cols.countA) !== student.gradeCount.A ||
          toCount(rows[r], cols.countB) !== student.gradeCount.B ||
          toCount(rows[r], cols.countC) !== student.gradeCount.C ||
          toCount(rows[r], cols.countS) !== student.gradeCount.S ||
          toCount(rows[r], cols.countW) !== student.gradeCount.W)
      ) {
        mismatch += 1;
      }

      students.push(student);
    }

    if (mismatch > 0) {
      warnings.push(
        `Sheet "${sheetName}": ${mismatch} row(s) had grade-count columns that differed from subject cells; subject-cell grades were used.`,
      );
    }
  }

  if (!students.length) {
    warnings.push(
      "No student rows found. Ensure the file is an O/L results register with candidate names and subject columns.",
    );
  }

  return { students, schoolName, examTitle, warnings };
}
