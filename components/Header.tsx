"use client";

import type { TabId } from "./Sidebar";

const TITLES: Record<TabId, string> = {
  dashboard: "Dashboard",
  students: "Students",
  "best-performance": "Best Performance",
  subjects: "Subjects",
  "year-compare": "Year Compare",
  download: "Download Reports",
};

interface HeaderProps {
  tab: TabId;
  onFile: (file: File) => void;
  studentCount: number;
  onPrint: () => void;
  examYear: string;
  onExamYearChange: (year: string) => void;
  savedYears: string[];
  onLoadYear: (year: string) => void;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
}

export function Header({
  tab,
  onFile,
  studentCount,
  onPrint,
  examYear,
  onExamYearChange,
  savedYears,
  onLoadYear,
  onSave,
  saving,
  canSave,
}: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--brand-royal)]/15 bg-white/70 px-5 py-3 shadow-sm backdrop-blur-md">
      <div>
        <h2 className="border-l-4 border-[var(--brand-gold)] pl-3 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--brand-deep-navy)]">
          {TITLES[tab]}
        </h2>
        {studentCount > 0 && (
          <p className="mt-0.5 pl-4 text-xs text-slate-500">
            {studentCount} candidates loaded
            {examYear ? ` · Exam year ${examYear}` : ""}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600">
          Year
          <input
            type="number"
            min={2000}
            max={2100}
            value={examYear}
            onChange={(e) => onExamYearChange(e.target.value)}
            className="w-20 rounded border border-slate-200 px-2 py-1 text-sm font-bold text-slate-800 outline-none focus:border-teal-600"
          />
        </label>

        {savedYears.length > 0 && (
          <select
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onLoadYear(e.target.value);
                e.target.value = "";
              }
            }}
          >
            <option value="" disabled>
              Load saved…
            </option>
            {savedYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          disabled={!canSave || saving}
          onClick={onSave}
          className="rounded-md bg-teal-700 px-3 py-2 text-sm font-bold text-white shadow transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save to DB"}
        </button>

        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 transition hover:border-[var(--brand-sky)] hover:bg-sky-50">
          <span className="font-semibold text-[var(--brand-royal)]">
            Upload Excel
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="max-w-[10rem] text-xs file:mr-2 file:rounded file:border-0 file:bg-[var(--brand-royal)]/10 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-[var(--brand-royal)]"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />
        </label>

        <button
          type="button"
          onClick={onPrint}
          className="rounded-md bg-[var(--brand-gold)] px-4 py-2 text-sm font-bold text-[var(--brand-deep-navy)] shadow transition hover:brightness-95"
        >
          School PDF
        </button>
      </div>
    </header>
  );
}
