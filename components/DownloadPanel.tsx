"use client";

import * as XLSX from "xlsx";
import type { AnalysisSummary, Student } from "@/lib/types";
import { SUBJECT_KEYS, SUBJECT_LABELS } from "@/lib/types";

interface DownloadPanelProps {
  students: Student[];
  summary: AnalysisSummary | null;
  schoolName: string;
  examTitle: string;
}

export function DownloadPanel({
  students,
  summary,
  schoolName,
  examTitle,
}: DownloadPanelProps) {
  function downloadCsv() {
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

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");

    if (summary) {
      const summaryRows = [
        ["School", schoolName],
        ["Exam", examTitle],
        ["Total", summary.totalStudents],
        ["Pass", summary.passCount, `${summary.passPercent}%`],
        ["Fail", summary.failCount, `${summary.failPercent}%`],
        ["Male pass %", summary.malePassPercent],
        ["Female pass %", summary.femalePassPercent],
        [],
        ["Subject", "Pass", "Fail", "Pass %"],
        ...summary.subjectPassFail.map((s) => [
          s.label,
          s.pass,
          s.fail,
          s.passPercent,
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, ws2, "Summary");
    }

    XLSX.writeFile(wb, "ol-results-analysis.xlsx");
  }

  return (
    <div className="panel mx-auto max-w-xl space-y-4 rounded-xl p-6">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-slate-800">
        Export analysed data
      </h3>
      <p className="text-sm text-slate-600">
        Download a cleaned workbook with parsed grades, pass/fail flags, and a
        subject summary sheet. Use <strong>School PDF</strong> in the header to
        print the current dashboard view.
      </p>
      <button
        type="button"
        disabled={!students.length}
        onClick={downloadCsv}
        className="rounded-md bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Download Excel Analysis
      </button>
      {!students.length && (
        <p className="text-xs text-slate-400">Upload a results file first.</p>
      )}
    </div>
  );
}
