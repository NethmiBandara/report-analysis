"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { analyzeStudents } from "@/lib/analysis";
import { parseResultsWorkbook } from "@/lib/parseExcel";
import type { Student } from "@/lib/types";
import { extractExamYear, isValidYear } from "@/lib/yearUtils";
import { BestPerformance } from "./BestPerformance";
import { Dashboard } from "./Dashboard";
import { DownloadPanel } from "./DownloadPanel";
import { Header } from "./Header";
import { Sidebar, type TabId } from "./Sidebar";
import { StudentsTable } from "./StudentsTable";
import { SubjectsPanel } from "./SubjectsPanel";
import { YearCompare } from "./YearCompare";

export function ResultsApp() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [students, setStudents] = useState<Student[]>([]);
  const [schoolName, setSchoolName] = useState("Defence Services College");
  const [examTitle, setExamTitle] = useState(
    "G.C.E. (Ordinary Level) Examination",
  );
  const [examYear, setExamYear] = useState(() =>
    String(new Date().getFullYear()),
  );
  const [status, setStatus] = useState(
    "Upload an O/L results Excel file to begin analysis.",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedYears, setSavedYears] = useState<string[]>([]);
  const [dbRefreshKey, setDbRefreshKey] = useState(0);

  const summary = useMemo(
    () => (students.length ? analyzeStudents(students) : null),
    [students],
  );

  const refreshSavedYears = useCallback(async () => {
    try {
      const res = await fetch("/api/years");
      const data = await res.json();
      if (res.ok) {
        setSavedYears(
          ((data.years || []) as { year: string }[]).map((y) => y.year),
        );
      }
    } catch {
      // ignore — DB list is optional for first load
    }
  }, []);

  useEffect(() => {
    void refreshSavedYears();
  }, [refreshSavedYears, dbRefreshKey]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setStatus(`Reading ${file.name}…`);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseResultsWorkbook(buffer);
      setStudents(result.students);
      setSchoolName(result.schoolName);
      setExamTitle(result.examTitle);
      setExamYear(extractExamYear(result.examTitle));

      if (!result.students.length) {
        setStatus(
          result.warnings.join(" ") ||
            "No students found in the uploaded file.",
        );
        return;
      }

      const warn =
        result.warnings.length > 0 ? ` (${result.warnings.join("; ")})` : "";
      setStatus(
        `Loaded ${result.students.length} candidates from ${file.name}.${warn} Set the year and click Save to DB.`,
      );
      setTab("dashboard");
    } catch (err) {
      console.error(err);
      setStudents([]);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to parse the Excel file. Try another format.",
      );
      setStatus("Upload failed. Please try a different .xlsx / .xls file.");
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!students.length) return;
    if (!isValidYear(examYear)) {
      setError("Enter a valid 4-digit exam year (e.g. 2025).");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: examYear.trim(),
          examTitle,
          schoolName,
          students,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setStatus(
        `Saved ${data.studentCount} candidates for year ${data.year} (Pass ${data.summary.passPercent}%). Open Year Compare to view trends.`,
      );
      setDbRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save to database");
    } finally {
      setSaving(false);
    }
  }, [students, examYear, examTitle, schoolName]);

  const handleLoadYear = useCallback(async (year: string) => {
    setError(null);
    setStatus(`Loading ${year} from database…`);
    try {
      const res = await fetch(`/api/years/${year}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");

      const record = data.record;
      setStudents(record.students);
      setSchoolName(record.schoolName);
      setExamTitle(record.examTitle);
      setExamYear(record.year);
      setStatus(
        `Loaded ${record.studentCount} candidates for ${record.year} from database.`,
      );
      setTab("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load year");
      setStatus("Could not load saved year.");
    }
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <div className="print:hidden h-screen shrink-0">
        <Sidebar active={tab} onChange={setTab} />
      </div>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="print:hidden">
          <Header
            tab={tab}
            onFile={handleFile}
            studentCount={students.length}
            onPrint={handlePrint}
            examYear={examYear}
            onExamYearChange={setExamYear}
            savedYears={savedYears}
            onLoadYear={(y) => void handleLoadYear(y)}
            onSave={() => void handleSave()}
            saving={saving}
            canSave={students.length > 0 && isValidYear(examYear)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5 print:p-0">
          <div className="mb-4 hidden print:block">
            <h1 className="text-xl font-bold text-[var(--brand-deep-navy)]">
              {schoolName}
            </h1>
            <p className="text-sm text-slate-600">
              {examTitle} · {examYear}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {tab === "dashboard" && (
            <Dashboard
              summary={summary}
              statusMessage={status}
              hasData={students.length > 0}
              schoolName={schoolName}
              examYear={examYear}
            />
          )}
          {tab === "students" && <StudentsTable students={students} />}
          {tab === "best-performance" && (
            <BestPerformance students={students} />
          )}
          {tab === "subjects" && (
            <SubjectsPanel
              summary={summary}
              schoolName={schoolName}
              examYear={examYear}
            />
          )}
          {tab === "year-compare" && (
            <YearCompare
              onLoadYear={(y) => void handleLoadYear(y)}
              refreshKey={dbRefreshKey}
            />
          )}
          {tab === "download" && (
            <DownloadPanel
              students={students}
              summary={summary}
              schoolName={schoolName}
              examTitle={examTitle}
              examYear={examYear}
            />
          )}
        </div>
      </main>
    </div>
  );
}
