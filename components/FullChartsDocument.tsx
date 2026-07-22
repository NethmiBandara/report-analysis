"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DATA,
  GRADE_COLORS,
  PASS_FAIL_COLORS,
} from "@/lib/colors";
import type { AnalysisSummary } from "@/lib/types";
import { ALL_GRADES } from "@/lib/types";

export type ChartDocSection = {
  id: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
};

function shortSubject(label: string) {
  return label
    .replace(" Subject Group", " Grp")
    .replace("Language & Literature", "Lang & Lit")
    .replace("English Language", "English");
}

interface FullChartsDocumentProps {
  summary: AnalysisSummary;
  schoolName: string;
  examTitle: string;
  examYear?: string;
}

/** Off-screen / capture target: all dashboard charts in one document. */
export function FullChartsDocument({
  summary,
  schoolName,
  examTitle,
  examYear,
}: FullChartsDocumentProps) {
  const meta = [schoolName, examTitle, examYear ? `Year ${examYear}` : null]
    .filter(Boolean)
    .join(" · ");

  const passFailPie = [
    { name: "Pass", value: summary.passCount, color: PASS_FAIL_COLORS.pass },
    { name: "Fail", value: summary.failCount, color: PASS_FAIL_COLORS.fail },
  ];

  const genderData = [
    {
      name: "Male",
      passPercent: summary.malePassPercent,
      count: summary.maleCount,
      passed: summary.malePassCount,
    },
    {
      name: "Female",
      passPercent: summary.femalePassPercent,
      count: summary.femaleCount,
      passed: summary.femalePassCount,
    },
  ];

  const gradePie = ALL_GRADES.map((g) => ({
    name: g,
    value: summary.overallGradeDist[g],
    color: GRADE_COLORS[g],
  })).filter((d) => d.value > 0);

  const subjectPassFail = summary.subjectPassFail.map((s) => ({
    name: shortSubject(s.label),
    Pass: s.pass,
    Fail: s.fail,
  }));

  const subjectGrades = summary.subjectGrades.map((s) => ({
    name: shortSubject(s.label),
    A: s.A,
    B: s.B,
    C: s.C,
    S: s.S,
    W: s.W,
  }));

  const subjectRateData = summary.subjectPassFail.map((s) => ({
    name: s.label
      .replace(" Subject Group", "")
      .replace("Language & Literature", "L&L")
      .replace("English Language", "Eng")
      .replace("Mathematics", "Maths"),
    rate: s.passPercent,
  }));

  const sections: ChartDocSection[] = [
    {
      id: "pass-vs-fail",
      title: "1. Overall Pass vs Fail",
      headers: ["Result", "Students", "Percent"],
      rows: [
        ["Pass", summary.passCount, `${summary.passPercent}%`],
        ["Fail", summary.failCount, `${summary.failPercent}%`],
        ["Total", summary.totalStudents, "100%"],
      ],
    },
    {
      id: "pass-by-gender",
      title: "2. Pass % by Gender",
      headers: ["Gender", "Passed", "Sat", "Pass %"],
      rows: genderData.map((g) => [
        g.name,
        g.passed,
        g.count,
        `${g.passPercent}%`,
      ]),
    },
    {
      id: "pass-fail-by-subject",
      title: "3. Pass & Fail by Subject",
      headers: ["Subject", "Pass", "Fail", "Sat", "Pass %"],
      rows: summary.subjectPassFail.map((s) => [
        s.label,
        s.pass,
        s.fail,
        s.total,
        `${s.passPercent}%`,
      ]),
    },
    {
      id: "grades-by-subject",
      title: "4. Grades by Subject",
      headers: ["Subject", "A", "B", "C", "S", "W"],
      rows: summary.subjectGrades.map((s) => [
        s.label,
        s.A,
        s.B,
        s.C,
        s.S,
        s.W,
      ]),
    },
    {
      id: "grade-distribution",
      title: "5. Overall Grade Distribution",
      headers: ["Grade", "Count", "Share"],
      rows: ALL_GRADES.map((g) => {
        const count = summary.overallGradeDist[g];
        const total = ALL_GRADES.reduce(
          (sum, key) => sum + summary.overallGradeDist[key],
          0,
        );
        const pct = total ? ((count / total) * 100).toFixed(1) : "0.0";
        return [g, count, `${pct}%`];
      }),
    },
    {
      id: "subject-pass-rate",
      title: "6. Subject Pass Rate (%)",
      headers: ["Subject", "Pass %", "Pass", "Fail"],
      rows: summary.subjectPassFail.map((s) => [
        s.label,
        `${s.passPercent}%`,
        s.pass,
        s.fail,
      ]),
    },
  ];

  return (
    <div
      id="full-charts-document"
      className="space-y-8 bg-white p-6 text-slate-900"
      data-meta={meta}
    >
      <header className="border-b-4 border-[var(--brand-royal)] pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-royal)]">
          O/L Results Analysis
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep-navy)]">
          Full Charts Document
        </h2>
        <p className="mt-1 text-sm text-slate-600">{meta}</p>
        <p className="mt-2 text-xs text-slate-500">
          Total {summary.totalStudents} · Pass {summary.passPercent}% · Fail{" "}
          {summary.failPercent}% · Avg A {summary.averageAPasses}
        </p>
      </header>

      <DocChart
        id={sections[0].id}
        title={sections[0].title}
        headers={sections[0].headers}
        rows={sections[0].rows}
      >
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={passFailPie}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={3}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
              }
            >
              {passFailPie.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </DocChart>

      <DocChart
        id={sections[1].id}
        title={sections[1].title}
        headers={sections[1].headers}
        rows={sections[1].rows}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={genderData} barSize={48}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} unit="%" />
            <Tooltip />
            <Bar dataKey="passPercent" name="Pass %" radius={[6, 6, 0, 0]}>
              <Cell fill={DATA.male} />
              <Cell fill={DATA.female} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </DocChart>

      <DocChart
        id={sections[2].id}
        title={sections[2].title}
        headers={sections[2].headers}
        rows={sections[2].rows}
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={subjectPassFail} margin={{ bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-28}
              textAnchor="end"
              height={70}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Pass" stackId="a" fill={PASS_FAIL_COLORS.pass} />
            <Bar
              dataKey="Fail"
              stackId="a"
              fill={PASS_FAIL_COLORS.fail}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </DocChart>

      <DocChart
        id={sections[3].id}
        title={sections[3].title}
        headers={sections[3].headers}
        rows={sections[3].rows}
      >
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={subjectGrades} margin={{ bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-28}
              textAnchor="end"
              height={70}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            {ALL_GRADES.map((g) => (
              <Bar key={g} dataKey={g} stackId="g" fill={GRADE_COLORS[g]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </DocChart>

      <DocChart
        id={sections[4].id}
        title={sections[4].title}
        headers={sections[4].headers}
        rows={sections[4].rows}
      >
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={gradePie}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={95}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {gradePie.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </DocChart>

      <DocChart
        id={sections[5].id}
        title={sections[5].title}
        headers={sections[5].headers}
        rows={sections[5].rows}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={subjectRateData} layout="vertical" margin={{ left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" domain={[0, 100]} unit="%" />
            <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="rate" name="Pass %" fill={DATA.rate} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </DocChart>
    </div>
  );
}

function DocChart({
  id,
  title,
  headers,
  rows,
  children,
}: {
  id: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
  children: React.ReactNode;
}) {
  return (
    <section
      className="break-inside-avoid rounded-lg border border-slate-200 p-4"
      data-doc-chart={id}
      data-doc-title={title}
    >
      <h3 className="mb-3 font-[family-name:var(--font-display)] text-base font-bold text-slate-800">
        {title}
      </h3>
      <div className="chart-export-root" data-doc-chart-graphic>
        {children}
      </div>
      <div className="mt-3 overflow-hidden rounded border border-slate-200">
        <table className="min-w-full text-xs" data-doc-chart-table>
          <thead className="bg-slate-100">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-2 py-1.5 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100">
                {row.map((cell, j) => (
                  <td key={j} className="px-2 py-1">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
