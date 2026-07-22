"use client";

import { useMemo, useState } from "react";
import type { Grade, Student } from "@/lib/types";
import { SUBJECT_KEYS, SUBJECT_LABELS } from "@/lib/types";
import { GRADE_COLORS } from "@/lib/colors";

interface StudentsTableProps {
  students: Student[];
}

const GRADE_FILTERS = ["ALL", "A", "B", "C", "S", "W"] as const;

function GradeBadge({
  grade,
  raw,
}: {
  grade: Grade | null | undefined;
  raw?: string;
}) {
  if (!grade) {
    return (
      <span className="text-slate-300" title={raw || "No result"}>
        —
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white"
      style={{ backgroundColor: GRADE_COLORS[grade] }}
      title={raw ? `${raw} → ${grade}` : grade}
    >
      {grade}
    </span>
  );
}

export function StudentsTable({ students }: StudentsTableProps) {
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState("ALL");
  const [resultFilter, setResultFilter] = useState<"ALL" | "PASS" | "FAIL">(
    "ALL",
  );
  const [minA, setMinA] = useState(0);
  const [subjectKey, setSubjectKey] = useState<(typeof SUBJECT_KEYS)[number] | "ALL">(
    "ALL",
  );
  const [subjectGrade, setSubjectGrade] =
    useState<(typeof GRADE_FILTERS)[number]>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (q) {
        const hay = `${s.name} ${s.indexNumber}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (gender !== "ALL" && s.gender !== gender) return false;
      if (resultFilter === "PASS" && !s.isOverallPass) return false;
      if (resultFilter === "FAIL" && s.isOverallPass) return false;
      if (s.gradeCount.A < minA) return false;
      if (subjectKey !== "ALL" && subjectGrade !== "ALL") {
        if (s.subjects[subjectKey] !== subjectGrade) return false;
      }
      return true;
    });
  }, [students, query, gender, resultFilter, minA, subjectKey, subjectGrade]);

  if (!students.length) {
    return (
      <div className="panel rounded-xl border-dashed p-10 text-center text-slate-500">
        Upload an Excel file to view the results table.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-end gap-3 rounded-xl p-4">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-semibold text-slate-600">
          Search name / index
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to filter…"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-[var(--data-accent)]"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Gender
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="ALL">All</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Overall result
          <select
            value={resultFilter}
            onChange={(e) =>
              setResultFilter(e.target.value as "ALL" | "PASS" | "FAIL")
            }
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="ALL">All</option>
            <option value="PASS">Pass (≥6)</option>
            <option value="FAIL">Fail (&lt;6)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Min. A grades
          <input
            type="number"
            min={0}
            max={9}
            value={minA}
            onChange={(e) => setMinA(Number(e.target.value) || 0)}
            className="w-20 rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Subject
          <select
            value={subjectKey}
            onChange={(e) =>
              setSubjectKey(
                e.target.value as (typeof SUBJECT_KEYS)[number] | "ALL",
              )
            }
            className="max-w-[10rem] rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="ALL">All subjects</option>
            {SUBJECT_KEYS.map((k) => (
              <option key={k} value={k}>
                {SUBJECT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Subject grade
          <select
            value={subjectGrade}
            onChange={(e) =>
              setSubjectGrade(e.target.value as (typeof GRADE_FILTERS)[number])
            }
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            disabled={subjectKey === "ALL"}
          >
            {GRADE_FILTERS.map((g) => (
              <option key={g} value={g}>
                {g === "ALL" ? "Any" : g}
              </option>
            ))}
          </select>
        </label>

        <p className="ml-auto text-sm text-slate-500">
          Showing <strong className="text-[var(--data-accent)]">{filtered.length}</strong>{" "}
          of {students.length}
        </p>
      </div>

      <div className="panel overflow-auto rounded-xl">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-[1] bg-[var(--data-header)] text-[var(--data-header-text)]">
            <tr>
              <th className="px-3 py-2.5 font-semibold">#</th>
              <th className="px-3 py-2.5 font-semibold">Name</th>
              <th className="px-3 py-2.5 font-semibold">Index</th>
              <th className="px-3 py-2.5 font-semibold">G</th>
              <th className="px-3 py-2.5 font-semibold">Med</th>
              {SUBJECT_KEYS.map((k) => (
                <th
                  key={k}
                  className="px-2 py-2.5 text-center font-semibold"
                  title={SUBJECT_LABELS[k]}
                >
                  {SUBJECT_LABELS[k]
                    .replace("Language & Literature", "L&L")
                    .replace("English Language", "Eng")
                    .replace("Mathematics", "Maths")
                    .replace("1st Subject Group", "G1")
                    .replace("2nd Subject Group", "G2")
                    .replace("3rd Subject Group", "G3")
                    .slice(0, 6)}
                </th>
              ))}
              <th className="px-2 py-2.5 text-center font-semibold text-emerald-300">
                A
              </th>
              <th className="px-2 py-2.5 text-center font-semibold">B</th>
              <th className="px-2 py-2.5 text-center font-semibold">C</th>
              <th className="px-2 py-2.5 text-center font-semibold">S</th>
              <th className="px-2 py-2.5 text-center font-semibold">W</th>
              <th className="px-3 py-2.5 font-semibold">Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr
                key={s.id}
                className="border-t border-slate-100 odd:bg-slate-900/[0.03] hover:bg-cyan-700/[0.08]"
              >
                <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                <td className="max-w-[14rem] truncate px-3 py-2 font-medium text-slate-800">
                  {s.name}
                </td>
                <td className="px-3 py-2 font-mono text-slate-600">
                  {s.indexNumber}
                </td>
                <td className="px-3 py-2">{s.gender}</td>
                <td className="px-3 py-2">{s.medium}</td>
                {SUBJECT_KEYS.map((k) => (
                  <td key={k} className="px-2 py-2 text-center">
                    <GradeBadge grade={s.subjects[k]} raw={s.rawSubjects[k]} />
                  </td>
                ))}
                <td className="px-2 py-2 text-center font-semibold">
                  {s.gradeCount.A}
                </td>
                <td className="px-2 py-2 text-center">{s.gradeCount.B}</td>
                <td className="px-2 py-2 text-center">{s.gradeCount.C}</td>
                <td className="px-2 py-2 text-center">{s.gradeCount.S}</td>
                <td className="px-2 py-2 text-center">{s.gradeCount.W}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      s.isOverallPass
                        ? "bg-teal-700/10 text-teal-800"
                        : "bg-rose-700/10 text-rose-700"
                    }`}
                  >
                    {s.isOverallPass ? "PASS" : "FAIL"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
