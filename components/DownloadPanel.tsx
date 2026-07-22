"use client";

import * as XLSX from "xlsx";
import type { AnalysisSummary, Student } from "@/lib/types";
import { ALL_GRADES, SUBJECT_KEYS, SUBJECT_LABELS } from "@/lib/types";
import { downloadCsv, slugifyFilename } from "@/lib/downloadUtils";

interface DownloadPanelProps {
  students: Student[];
  summary: AnalysisSummary | null;
  schoolName: string;
  examTitle: string;
  examYear?: string;
}

type ChartPack = {
  id: string;
  title: string;
  description: string;
  headers: string[];
  rows: (string | number)[][];
};

function buildChartPacks(summary: AnalysisSummary): ChartPack[] {
  return [
    {
      id: "pass-vs-fail",
      title: "1. Overall Pass vs Fail",
      description: "School overall pass and fail counts with percentages.",
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
      description: "Male and female pass rates with sat / passed counts.",
      headers: ["Gender", "Passed", "Sat", "Pass %"],
      rows: [
        [
          "Male",
          summary.malePassCount,
          summary.maleCount,
          `${summary.malePassPercent}%`,
        ],
        [
          "Female",
          summary.femalePassCount,
          summary.femaleCount,
          `${summary.femalePassPercent}%`,
        ],
      ],
    },
    {
      id: "pass-fail-by-subject",
      title: "3. Pass & Fail by Subject",
      description: "Per-subject pass, fail, sat, and pass rate.",
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
      description: "A / B / C / S / W counts for every subject.",
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
      description: "Total grade letters across all candidates and subjects.",
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
      description: "Clear pass-rate ranking for each subject.",
      headers: ["Subject", "Pass %", "Pass", "Fail"],
      rows: summary.subjectPassFail.map((s) => [
        s.label,
        `${s.passPercent}%`,
        s.pass,
        s.fail,
      ]),
    },
  ];
}

export function DownloadPanel({
  students,
  summary,
  schoolName,
  examTitle,
  examYear,
}: DownloadPanelProps) {
  const packs = summary ? buildChartPacks(summary) : [];
  const yearTag = examYear || "results";
  const prefix = slugifyFilename(`${schoolName}-${yearTag}`);

  function downloadFullExcel() {
    if (!students.length) return;

    const headers = [
      "Name",
      "Index",
      "Gender",
      "Medium",
      "Attempt",
      ...SUBJECT_KEYS.map((k) => SUBJECT_LABELS[k]),
      "A",
      "B",
      "C",
      "S",
      "W",
      "Pass Count",
      "Overall",
    ];

    const rows = students.map((s) => [
      s.name,
      s.indexNumber,
      s.gender,
      s.medium,
      s.attemptNo,
      ...SUBJECT_KEYS.map((k) => s.subjects[k] ?? ""),
      s.gradeCount.A,
      s.gradeCount.B,
      s.gradeCount.C,
      s.gradeCount.S,
      s.gradeCount.W,
      s.passCount,
      s.isOverallPass ? "PASS" : "FAIL",
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([headers, ...rows]),
      "Results",
    );

    if (summary) {
      const overview = [
        ["School", schoolName],
        ["Exam", examTitle],
        ["Year", examYear || ""],
        ["Total candidates", summary.totalStudents],
        ["Pass", summary.passCount, `${summary.passPercent}%`],
        ["Fail", summary.failCount, `${summary.failPercent}%`],
        ["Male pass %", summary.malePassPercent],
        ["Female pass %", summary.femalePassPercent],
        ["Average A grades", summary.averageAPasses],
      ];
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(overview),
        "Overview",
      );

      for (const pack of packs) {
        const sheetName = pack.title
          .replace(/^\d+\.\s*/, "")
          .slice(0, 28)
          .replace(/[\\/?*[\]]/g, "");
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.aoa_to_sheet([pack.headers, ...pack.rows]),
          sheetName || pack.id,
        );
      }
    }

    XLSX.writeFile(wb, `${prefix}-full-analysis.xlsx`);
  }

  function downloadChartsWorkbook() {
    if (!summary || !packs.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["School", schoolName],
        ["Exam", examTitle],
        ["Year", examYear || ""],
        [],
        ["Sheet", "Chart"],
        ...packs.map((p) => [p.title.replace(/^\d+\.\s*/, ""), p.description]),
      ]),
      "Index",
    );

    for (const pack of packs) {
      const sheetName = pack.title
        .replace(/^\d+\.\s*/, "")
        .slice(0, 28)
        .replace(/[\\/?*[\]]/g, "");
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          [pack.title],
          [pack.description],
          [],
          pack.headers,
          ...pack.rows,
        ]),
        sheetName || pack.id,
      );
    }

    XLSX.writeFile(wb, `${prefix}-chart-details.xlsx`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="panel rounded-xl p-6">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-slate-800">
          Download reports
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Export analysed student rows, or download each graph&apos;s numbers as
          clear tables. On the <strong>Dashboard</strong>, use{" "}
          <strong>Download graph</strong> (PNG) and{" "}
          <strong>Download data</strong> (CSV) on every chart.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!students.length}
            onClick={downloadFullExcel}
            className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Full Excel analysis
          </button>
          <button
            type="button"
            disabled={!summary}
            onClick={downloadChartsWorkbook}
            className="rounded-md bg-[var(--brand-royal)] px-4 py-2.5 text-sm font-bold text-white shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            All chart details (Excel)
          </button>
        </div>
        {!students.length && (
          <p className="mt-3 text-xs text-slate-400">
            Upload a results file first.
          </p>
        )}
      </div>

      {summary && (
        <div className="space-y-3">
          <h4 className="font-[family-name:var(--font-display)] text-sm font-bold text-slate-700">
            Download each graph&apos;s details
          </h4>
          {packs.map((pack) => (
            <article
              key={pack.id}
              className="panel rounded-xl p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h5 className="text-sm font-bold text-slate-800">
                    {pack.title}
                  </h5>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {pack.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      pack.headers,
                      pack.rows,
                      `${prefix}-${pack.id}`,
                    )
                  }
                  className="shrink-0 rounded-md bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800"
                >
                  Download CSV
                </button>
              </div>

              <div className="mt-3 overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      {pack.headers.map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2 text-left font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pack.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-slate-100 odd:bg-white even:bg-slate-50/80"
                      >
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className={`whitespace-nowrap px-3 py-1.5 ${
                              j === 0
                                ? "font-medium text-slate-800"
                                : "text-slate-600"
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
