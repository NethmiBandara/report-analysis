"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART } from "@/lib/colors";
import { SUBJECT_KEYS, SUBJECT_LABELS, type YearListItem } from "@/lib/types";

interface YearCompareProps {
  onLoadYear: (year: string) => void;
  refreshKey?: number;
}

const YEAR_COLORS = [CHART.mint, CHART.purple, CHART.pink, CHART.yellow, "#0054A6", "#2E3192"];

export function YearCompare({ onLoadYear, refreshKey = 0 }: YearCompareProps) {
  const [years, setYears] = useState<YearListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [subjectData, setSubjectData] = useState<
    Record<string, Record<string, number>>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/years");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load years");
      const list = (data.years || []) as YearListItem[];
      setYears(list);

      // Load subject pass % per year for comparison chart
      const subjectMap: Record<string, Record<string, number>> = {};
      await Promise.all(
        list.map(async (item) => {
          const r = await fetch(`/api/years/${item.year}`);
          const j = await r.json();
          if (!r.ok || !j.record) return;
          const rates: Record<string, number> = {};
          for (const row of j.record.summary.subjectPassFail) {
            rates[row.subject] = row.passPercent;
          }
          subjectMap[item.year] = rates;
        }),
      );
      setSubjectData(subjectMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load database");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const overview = useMemo(
    () =>
      years.map((y) => ({
        year: y.year,
        passPercent: y.passPercent,
        failPercent: y.failPercent,
        malePassPercent: y.malePassPercent,
        femalePassPercent: y.femalePassPercent,
        averageAPasses: y.averageAPasses,
        studentCount: y.studentCount,
      })),
    [years],
  );

  const subjectChart = useMemo(() => {
    return SUBJECT_KEYS.map((key) => {
      const row: Record<string, string | number> = {
        name: SUBJECT_LABELS[key]
          .replace("Language & Literature", "L&L")
          .replace("English Language", "Eng")
          .replace("Mathematics", "Maths")
          .replace(" Subject Group", ""),
      };
      for (const y of years) {
        row[y.year] = subjectData[y.year]?.[key] ?? 0;
      }
      return row;
    });
  }, [years, subjectData]);

  async function handleDelete(year: string) {
    if (!confirm(`Delete saved results for ${year}? This cannot be undone.`)) {
      return;
    }
    setDeleting(year);
    try {
      const res = await fetch(`/api/years/${year}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="panel rounded-xl p-8 text-center text-slate-500">
        Loading saved years…
      </div>
    );
  }

  if (!years.length) {
    return (
      <div className="panel-tint rounded-xl p-8 text-[var(--brand-deep-navy)]">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
          No years saved yet
        </h3>
        <p className="mt-2 text-sm opacity-80">
          Upload an Excel file, set the exam year, then click{" "}
          <strong>Save to DB</strong>. After you save two or more years, comparison
          charts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="panel overflow-auto rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--data-header)] text-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Year</th>
              <th className="px-3 py-3 text-center">Students</th>
              <th className="px-3 py-3 text-center">Pass %</th>
              <th className="px-3 py-3 text-center">Fail %</th>
              <th className="px-3 py-3 text-center">Male pass %</th>
              <th className="px-3 py-3 text-center">Female pass %</th>
              <th className="px-3 py-3 text-center">Avg A</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr
                key={y.year}
                className="border-t border-slate-100 odd:bg-slate-900/[0.03]"
              >
                <td className="px-4 py-2.5 font-bold text-slate-800">{y.year}</td>
                <td className="px-3 py-2.5 text-center">{y.studentCount}</td>
                <td className="px-3 py-2.5 text-center font-semibold text-teal-700">
                  {y.passPercent}%
                </td>
                <td className="px-3 py-2.5 text-center text-rose-600">
                  {y.failPercent}%
                </td>
                <td className="px-3 py-2.5 text-center">{y.malePassPercent}%</td>
                <td className="px-3 py-2.5 text-center">{y.femalePassPercent}%</td>
                <td className="px-3 py-2.5 text-center">{y.averageAPasses}</td>
                <td className="space-x-2 px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onLoadYear(y.year)}
                    className="rounded-md bg-teal-700 px-3 py-1 text-xs font-bold text-white hover:bg-teal-800"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    disabled={deleting === y.year}
                    onClick={() => void handleDelete(y.year)}
                    className="rounded-md bg-rose-600/90 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {deleting === y.year ? "…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {years.length >= 2 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartPanel title="Pass % by year">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={overview}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="passPercent"
                  name="Pass %"
                  stroke={CHART.mint}
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="failPercent"
                  name="Fail %"
                  stroke={CHART.pink}
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Gender pass % by year">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overview}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="malePassPercent"
                  name="Male"
                  fill={CHART.purple}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="femalePassPercent"
                  name="Female"
                  fill={CHART.yellow}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Candidates & average A grades">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overview}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="studentCount"
                  name="Students"
                  fill={CHART.mint}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="averageAPasses"
                  name="Avg A grades"
                  fill={CHART.purple}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Subject pass % by year" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={subjectChart} margin={{ bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={70}
                />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip />
                <Legend />
                {years.map((y, i) => (
                  <Bar
                    key={y.year}
                    dataKey={y.year}
                    fill={YEAR_COLORS[i % YEAR_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>
      ) : (
        <div className="panel-tint rounded-xl px-4 py-3 text-sm text-[var(--brand-deep-navy)]">
          Saved <strong>{years[0].year}</strong>. Upload and save at least one more
          year to unlock year-wise comparison charts.
        </div>
      )}
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
