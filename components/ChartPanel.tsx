"use client";

import { useRef, useState } from "react";
import {
  downloadChartPng,
  downloadCsv,
  slugifyFilename,
} from "@/lib/downloadUtils";

export interface ChartDetailTable {
  headers: string[];
  rows: (string | number)[][];
}

interface ChartPanelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  /** Shown under the chart and used for CSV / PNG footer */
  details?: ChartDetailTable;
  /** Base name for download files (without extension) */
  fileBase: string;
  meta?: string;
  /** Set false for table-only panels (no SVG chart) */
  enableGraphDownload?: boolean;
  /** Hide the detail table under the chart (data still available for CSV) */
  showDetailTable?: boolean;
}

export function ChartPanel({
  title,
  subtitle,
  children,
  className = "",
  details,
  fileBase,
  meta,
  enableGraphDownload = true,
  showDetailTable = true,
}: ChartPanelProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"png" | "csv" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(showDetailTable);

  const base = slugifyFilename(fileBase);

  async function handlePng() {
    if (!chartRef.current) return;
    setBusy("png");
    setError(null);
    try {
      await downloadChartPng({
        chartRoot: chartRef.current,
        title,
        subtitle: [meta, subtitle].filter(Boolean).join(" · ") || undefined,
        detailHeaders: details?.headers,
        detailRows: details?.rows,
        filename: `${base}-graph`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "PNG download failed");
    } finally {
      setBusy(null);
    }
  }

  function handleCsv() {
    if (!details?.rows.length) return;
    setBusy("csv");
    setError(null);
    try {
      downloadCsv(details.headers, details.rows, `${base}-data`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV download failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      className={`panel rounded-xl p-4 ${className}`}
      data-chart-panel={base}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-slate-800">
            {title}
          </h3>
          {(subtitle || meta) && (
            <p className="mt-0.5 text-xs text-slate-500">
              {[meta, subtitle].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <div className="print:hidden flex flex-wrap items-center gap-1.5">
          {details && details.rows.length > 0 && showDetailTable && (
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              {showDetails ? "Hide details" : "Show details"}
            </button>
          )}
          {enableGraphDownload && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void handlePng()}
              className="rounded-md bg-[var(--brand-royal)] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-50"
              title="Download graph as PNG image"
            >
              {busy === "png" ? "Saving…" : "Download graph"}
            </button>
          )}
          <button
            type="button"
            disabled={busy !== null || !details?.rows.length}
            onClick={handleCsv}
            className="rounded-md bg-teal-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
            title="Download chart numbers as CSV"
          >
            {busy === "csv" ? "Saving…" : "Download data"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
          {error}
        </p>
      )}

      <div ref={chartRef} className="chart-export-root">
        {children}
      </div>

      {details && details.rows.length > 0 && showDetailTable && showDetails && (
        <div className="mt-4 overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                {details.headers.map((h) => (
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
              {details.rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-t border-slate-100 odd:bg-white even:bg-slate-50/80"
                >
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`whitespace-nowrap px-3 py-1.5 ${
                        j === 0 ? "font-medium text-slate-800" : "text-slate-600"
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
      )}
    </section>
  );
}
