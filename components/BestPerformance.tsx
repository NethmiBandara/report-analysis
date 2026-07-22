"use client";

import { useMemo } from "react";
import type { Student } from "@/lib/types";
import { DATA, STAT_ACCENTS } from "@/lib/colors";

interface BestPerformanceProps {
  students: Student[];
}

function scoreStudent(s: Student): number {
  return (
    s.gradeCount.A * 5 +
    s.gradeCount.B * 4 +
    s.gradeCount.C * 3 +
    s.gradeCount.S * 2 +
    s.gradeCount.W * 0
  );
}

export function BestPerformance({ students }: BestPerformanceProps) {
  const ranked = useMemo(() => {
    return [...students]
      .map((s) => ({ student: s, score: scoreStudent(s) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.student.gradeCount.A !== a.student.gradeCount.A) {
          return b.student.gradeCount.A - a.student.gradeCount.A;
        }
        return b.student.gradeCount.B - a.student.gradeCount.B;
      })
      .slice(0, 25);
  }, [students]);

  const nineAs = useMemo(
    () => students.filter((s) => s.gradeCount.A >= 9),
    [students],
  );

  if (!students.length) {
    return (
      <div className="panel rounded-xl border-dashed p-10 text-center text-slate-500">
        Upload results to see top performers.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel rounded-xl p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">
            9A Candidates
          </p>
          <p
            className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold"
            style={{ color: STAT_ACCENTS.average }}
          >
            {nineAs.length}
          </p>
        </div>
        <div className="panel rounded-xl p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Top score (weighted)
          </p>
          <p
            className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold"
            style={{ color: DATA.accent }}
          >
            {ranked[0]?.score ?? 0}
          </p>
        </div>
        <div className="panel rounded-xl p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Island / School top
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-slate-800">
            {ranked[0]?.student.name ?? "—"}
          </p>
        </div>
      </div>

      <div className="panel overflow-auto rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--data-header)] text-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Index</th>
              <th className="px-4 py-3 text-center">A</th>
              <th className="px-4 py-3 text-center">B</th>
              <th className="px-4 py-3 text-center">C</th>
              <th className="px-4 py-3 text-center">S</th>
              <th className="px-4 py-3 text-center">W</th>
              <th className="px-4 py-3 text-center">Score</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, i) => (
              <tr
                key={row.student.id}
                className="border-t border-slate-100 odd:bg-slate-900/[0.03]"
              >
                <td className="px-4 py-2.5 font-bold text-violet-600">
                  #{i + 1}
                </td>
                <td className="px-4 py-2.5 font-medium">{row.student.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                  {row.student.indexNumber}
                </td>
                <td className="px-4 py-2.5 text-center font-semibold">
                  {row.student.gradeCount.A}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {row.student.gradeCount.B}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {row.student.gradeCount.C}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {row.student.gradeCount.S}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {row.student.gradeCount.W}
                </td>
                <td className="px-4 py-2.5 text-center font-bold text-teal-800">
                  {row.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
