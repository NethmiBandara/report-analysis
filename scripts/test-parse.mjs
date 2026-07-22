import * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function extractGrade(cell) {
  if (cell == null || cell === "") return null;
  let raw = typeof cell === "number" ? String(cell) : String(cell);
  raw = raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  if (!raw || raw === "-" || raw === "—" || raw === "N/A") return null;
  if (["A", "B", "C", "S", "W"].includes(raw)) return raw;

  let m = raw.match(/^(\d{1,3})\s+([ABCSW])\s+(\d)\s*$/);
  if (m) return m[2];
  m = raw.match(/^(\d{2,3})([ESTB])([ABCSW])\s*(\d)\s*$/);
  if (m) return m[3];
  m = raw.match(/^(\d{2,3})([ABCSW])\s*(\d)\s*$/);
  if (m) return m[2];
  m = raw.match(/([ABCSW])\s*(\d)\s*$/);
  if (m) return m[1];
  const tokens = raw.match(/\b([ABCSW])\b/g);
  if (tokens?.length === 1) return tokens[0];
  return null;
}

const cases = [
  ["11BA 2", "A"],
  ["11BA2", "A"],
  ["21 B 2", "B"],
  ["21B2", "B"],
  ["31 A 1", "A"],
  ["34EA 2", "A"],
  ["32EA 1", "A"],
  ["33BA 1", "A"],
  ["61EA 1", "A"],
  ["46 B 2", "B"],
  ["80EA 1", "A"],
  ["11BC 2", "C"],
  ["31 B 2", "B"],
  ["34BC 2", "C"],
  ["32BC 1", "C"],
  ["33BC 2", "C"],
  ["60BC 2", "C"],
  ["41 C 3", "C"],
  ["80BC 2", "C"],
  ["33SS 1", "S"],
  ["60EC 2", "C"],
  ["46 W 3", "W"],
  ["", null],
  ["A", "A"],
];

let failed = 0;
for (const [input, expected] of cases) {
  const got = extractGrade(input);
  if (got !== expected) {
    console.error(`FAIL extractGrade(${JSON.stringify(input)}) => ${got}, expected ${expected}`);
    failed++;
  }
}

// Build a realistic workbook matching the image and re-parse with positional logic
const header = [
  "NAME OF THE CANDIDATE",
  "ATTEMPT NO",
  "GENDER",
  "MEDIUM",
  "INDEX NUMBER",
  "1 RELIGION",
  "2 LANGUAGE & LITERATURE",
  "3 ENGLISH LANGUAGE",
  "4 SCIENCE",
  "5 MATHEMATICS",
  "6 HISTORY",
  "7 1ST SUBJECT GROUP",
  "8 2ND SUBJECT GROUP",
  "9 3RD SUBJECT GROUP",
  "A",
  "B",
  "C",
  "S",
  "W",
];

const row1 = [
  "PONNAMPERUMA ARACHCHIGE DON SATHYUGA NISALITHA PONNAMPERUMA",
  1,
  "M",
  "S",
  53497473,
  "11BA 2",
  "21 B 2",
  "31 A 1",
  "34EA 2",
  "32EA 1",
  "33BA 1",
  "61EA 1",
  "46 B 2",
  "80EA 1",
  7,
  2,
  0,
  0,
  0,
];

const row2 = [
  "GALLE PATHIRANAGE THISAGA THISEW",
  1,
  "M",
  "S",
  53497481,
  "11BC 2",
  "",
  "31 B 2",
  "34BC 2",
  "32BC 1",
  "33BC 2",
  "60BC 2",
  "41 C 3",
  "80BC 2",
  0,
  1,
  7,
  0,
  0,
];

const grades1 = row1.slice(5, 14).map(extractGrade);
const grades2 = row2.slice(5, 14).map(extractGrade);
const count = (grades) =>
  grades.reduce(
    (acc, g) => {
      if (g) acc[g]++;
      return acc;
    },
    { A: 0, B: 0, C: 0, S: 0, W: 0 },
  );

const c1 = count(grades1);
const c2 = count(grades2);
console.log("Row1 grades", grades1, c1);
console.log("Row2 grades", grades2, c2);

if (c1.A !== 7 || c1.B !== 2) {
  console.error("FAIL row1 counts", c1);
  failed++;
}
if (c2.B !== 1 || c2.C !== 7) {
  console.error("FAIL row2 counts", c2);
  failed++;
}

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ["G.C.E. (Ordinary Level) Examination 2025(2026)"],
  ["School: CS/DEFENCE SERVICE COLLEGE, COLOMBO 02."],
  [],
  header,
  row1,
  row2,
]);
XLSX.utils.book_append_sheet(wb, ws, "Results");
const out = join(__dirname, "..", "public", "sample-ol-results.xlsx");
XLSX.writeFile(wb, out);

// Simulate positional parse
const buf = readFileSync(out);
const book = XLSX.read(buf, { type: "buffer", raw: true });
const rows = XLSX.utils.sheet_to_json(book.Sheets.Results, {
  header: 1,
  defval: "",
  raw: true,
});
const data = rows.slice(4);
for (const r of data) {
  const subjects = r.slice(5, 14).map(extractGrade);
  const derived = count(subjects);
  const sheet = { A: r[14], B: r[15], C: r[16], S: r[17], W: r[18] };
  const ok =
    derived.A === sheet.A &&
    derived.B === sheet.B &&
    derived.C === sheet.C &&
    derived.S === sheet.S &&
    derived.W === sheet.W;
  console.log(r[0].slice(0, 30), "derived", derived, "sheet", sheet, ok ? "OK" : "MISMATCH");
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll extractGrade + sample workbook checks passed.");
