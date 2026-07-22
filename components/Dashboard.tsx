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
  STAT_ACCENTS,
} from "@/lib/colors";
import type { AnalysisSummary } from "@/lib/types";
import { ALL_GRADES } from "@/lib/types";

interface DashboardProps {
  summary: AnalysisSummary | null;
  statusMessage: string;
  hasData: boolean;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div
      className="panel rounded-xl p-4"
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold"
        style={{ color: accent }}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function Dashboard({ summary, statusMessage, hasData }: DashboardProps) {
  if (!hasData || !summary) {
    return (
      <div className="panel-tint rounded-xl p-6 text-[var(--brand-deep-navy)]">
        <p className="font-semibold">{statusMessage}</p>
        <p className="mt-2 text-sm opacity-80">
          Upload a Department of Examinations O/L results Excel (.xlsx / .xls).
          Grades are read from the middle letter in cells such as{" "}
          <code className="rounded bg-white/70 px-1">21 B 2</code> → B.
        </p>
        <ul className="mt-3 list-inside list-disc text-sm opacity-80">
          <li>A ≥ 75 &nbsp; B 65–74 &nbsp; C 55–64 &nbsp; S 35–54 &nbsp; W &lt; 35</li>
          <li>Overall pass = at least 6 subjects with S or above</li>
        </ul>
      </div>
    );
  }

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
    name: s.label.replace(" Subject Group", " Grp").replace("Language & Literature", "Lang & Lit"),
    Pass: s.pass,
    Fail: s.fail,
  }));

  const subjectGrades = summary.subjectGrades.map((s) => ({
    name: s.label
      .replace(" Subject Group", " Grp")
      .replace("Language & Literature", "Lang & Lit")
      .replace("English Language", "English"),
    A: s.A,
    B: s.B,
    C: s.C,
    S: s.S,
    W: s.W,
  }));

  return (
    <div className="space-y-6">
      <div className="panel-tint rounded-lg px-4 py-3 text-sm text-[var(--brand-deep-navy)]">
        {statusMessage}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Candidates"
          value={String(summary.totalStudents)}
          accent={STAT_ACCENTS.total}
        />
        <StatCard
          label="Pass Rate"
          value={`${summary.passPercent}%`}
          sub={`${summary.passCount} students (≥ 6 passes)`}
          accent={STAT_ACCENTS.pass}
        />
        <StatCard
          label="Fail Rate"
          value={`${summary.failPercent}%`}
          sub={`${summary.failCount} students`}
          accent={STAT_ACCENTS.fail}
        />
        <StatCard
          label="Avg. A Grades"
          value={String(summary.averageAPasses)}
          sub="Per student"
          accent={STAT_ACCENTS.average}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel title="1. Overall Pass vs Fail %">
          <ResponsiveContainer width="100%" height={260}>
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
        </ChartPanel>

        <ChartPanel title="5. Pass % by Gender">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={genderData} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
              <Tooltip
                formatter={(value, _n, item) => {
                  const row = item?.payload as {
                    passed?: number;
                    count?: number;
                  };
                  return [
                    `${value}% (${row?.passed ?? 0}/${row?.count ?? 0})`,
                    "Pass rate",
                  ];
                }}
              />
              <Bar dataKey="passPercent" name="Pass %" radius={[6, 6, 0, 0]}>
                <Cell fill={DATA.male} />
                <Cell fill={DATA.female} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="3. Pass & Fail by Subject" className="lg:col-span-2">
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
              <YAxis tick={{ fontSize: 12 }} />
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
        </ChartPanel>

        <ChartPanel title="4. Grades by Subject" className="lg:col-span-2">
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
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {ALL_GRADES.map((g) => (
                <Bar key={g} dataKey={g} stackId="g" fill={GRADE_COLORS[g]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="6. Overall Grade Distribution">
          <ResponsiveContainer width="100%" height={260}>
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
        </ChartPanel>

        <ChartPanel title="6. Subject Pass Rate (%)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={summary.subjectPassFail.map((s) => ({
                name: s.label
                  .replace(" Subject Group", "")
                  .replace("Language & Literature", "L&L")
                  .replace("English Language", "Eng")
                  .replace("Mathematics", "Maths"),
                rate: s.passPercent,
              }))}
              layout="vertical"
              margin={{ left: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={72}
                tick={{ fontSize: 10 }}
              />
              <Tooltip formatter={(v) => [`${v}%`, "Pass rate"]} />
              <Bar dataKey="rate" name="Pass %" fill={DATA.rate} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel rounded-xl p-4 ${className}`}>
      <h3 className="mb-3 font-[family-name:var(--font-display)] text-sm font-bold text-slate-800">
        {title}
      </h3>
      {children}
    </section>
  );
}
