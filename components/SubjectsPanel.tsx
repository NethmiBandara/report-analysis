"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalysisSummary } from "@/lib/types";
import { ALL_GRADES } from "@/lib/types";
import { GRADE_COLORS } from "@/lib/colors";

interface SubjectsPanelProps {
  summary: AnalysisSummary | null;
}

export function SubjectsPanel({ summary }: SubjectsPanelProps) {
  if (!summary) {
    return (
      <div className="panel rounded-xl border-dashed p-10 text-center text-slate-500">
        Upload results to analyse subjects.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="panel overflow-auto rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--data-header)] text-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-3 py-3 text-center">Sat</th>
              <th className="px-3 py-3 text-center">Pass</th>
              <th className="px-3 py-3 text-center">Fail</th>
              <th className="px-3 py-3 text-center">Pass %</th>
              {ALL_GRADES.map((g) => (
                <th key={g} className="px-3 py-3 text-center">
                  {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.subjectPassFail.map((row) => {
              const grades = summary.subjectGrades.find(
                (g) => g.subject === row.subject,
              );
              return (
                <tr
                  key={row.subject}
                  className="border-t border-slate-100 odd:bg-slate-900/[0.03]"
                >
                  <td className="px-4 py-2.5 font-medium">{row.label}</td>
                  <td className="px-3 py-2.5 text-center">{row.total}</td>
                  <td className="px-3 py-2.5 text-center text-teal-800">
                    {row.pass}
                  </td>
                  <td className="px-3 py-2.5 text-center text-rose-700">
                    {row.fail}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold">
                    {row.passPercent}%
                  </td>
                  {ALL_GRADES.map((g) => (
                    <td key={g} className="px-3 py-2.5 text-center">
                      {grades?.[g] ?? 0}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel rounded-xl p-4">
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-sm font-bold text-slate-800">
          Grade mix per subject
        </h3>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={summary.subjectGrades.map((s) => ({
              name: s.label
                .replace(" Subject Group", "")
                .replace("Language & Literature", "L&L")
                .replace("English Language", "English"),
              A: s.A,
              B: s.B,
              C: s.C,
              S: s.S,
              W: s.W,
            }))}
            margin={{ bottom: 56 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={70}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            {ALL_GRADES.map((g) => (
              <Bar key={g} dataKey={g} fill={GRADE_COLORS[g]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
