import { promises as fs } from "fs";
import path from "path";
import type { Student, YearListItem, YearRecord } from "./types";
import { analyzeStudents } from "./analysis";

const DATA_DIR = path.join(process.cwd(), "data");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function yearFile(year: string) {
  return path.join(DATA_DIR, `year-${year}.json`);
}

async function readIndex(): Promise<string[]> {
  try {
    const raw = await fs.readFile(INDEX_FILE, "utf8");
    const parsed = JSON.parse(raw) as { years?: string[] };
    return Array.isArray(parsed.years) ? parsed.years.sort() : [];
  } catch {
    return [];
  }
}

async function writeIndex(years: string[]) {
  await ensureDataDir();
  const unique = [...new Set(years)].sort();
  await fs.writeFile(
    INDEX_FILE,
    JSON.stringify({ years: unique }, null, 2),
    "utf8",
  );
}

export async function listYears(): Promise<YearListItem[]> {
  const years = await readIndex();
  const items: YearListItem[] = [];

  for (const year of years) {
    try {
      const record = await getYear(year);
      if (!record) continue;
      items.push({
        year: record.year,
        examTitle: record.examTitle,
        schoolName: record.schoolName,
        uploadedAt: record.uploadedAt,
        studentCount: record.studentCount,
        passCount: record.summary.passCount,
        failCount: record.summary.failCount,
        passPercent: record.summary.passPercent,
        failPercent: record.summary.failPercent,
        malePassPercent: record.summary.malePassPercent,
        femalePassPercent: record.summary.femalePassPercent,
        averageAPasses: record.summary.averageAPasses,
      });
    } catch {
      // skip corrupt year files
    }
  }

  return items.sort((a, b) => a.year.localeCompare(b.year));
}

export async function getYear(year: string): Promise<YearRecord | null> {
  try {
    const raw = await fs.readFile(yearFile(year), "utf8");
    return JSON.parse(raw) as YearRecord;
  } catch {
    return null;
  }
}

export async function saveYear(input: {
  year: string;
  examTitle: string;
  schoolName: string;
  students: Student[];
}): Promise<YearRecord> {
  const year = input.year.trim();
  if (!/^20\d{2}$/.test(year)) {
    throw new Error("Year must be a 4-digit year like 2025.");
  }
  if (!input.students?.length) {
    throw new Error("Cannot save an empty student list.");
  }

  const summary = analyzeStudents(input.students);
  const record: YearRecord = {
    year,
    examTitle: input.examTitle,
    schoolName: input.schoolName,
    uploadedAt: new Date().toISOString(),
    studentCount: input.students.length,
    summary,
    students: input.students,
  };

  await ensureDataDir();
  await fs.writeFile(yearFile(year), JSON.stringify(record), "utf8");

  const years = await readIndex();
  if (!years.includes(year)) years.push(year);
  await writeIndex(years);

  return record;
}

export async function deleteYear(year: string): Promise<boolean> {
  const years = await readIndex();
  if (!years.includes(year)) return false;

  try {
    await fs.unlink(yearFile(year));
  } catch {
    // file may already be gone
  }

  await writeIndex(years.filter((y) => y !== year));
  return true;
}
