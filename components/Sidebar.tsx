"use client";

import Image from "next/image";

export type TabId =
  | "dashboard"
  | "students"
  | "subjects"
  | "best-performance"
  | "year-compare"
  | "download";

const NAV: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "students", label: "Students" },
  { id: "best-performance", label: "Best Performance" },
  { id: "subjects", label: "Subjects" },
  { id: "year-compare", label: "Year Compare" },
  { id: "download", label: "Download" },
];

interface SidebarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="sidebar-nav flex h-full min-h-screen w-64 shrink-0 flex-col text-white shadow-xl">
      <div className="flex flex-col items-center border-b border-white/10 px-5 py-6 text-center">
        <div className="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--brand-gold)] bg-black shadow-lg">
          <Image
            src="/logo.png"
            alt="Defence Services College crest"
            width={96}
            height={96}
            className="h-[92%] w-[92%] object-contain object-center"
            priority
          />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-[var(--brand-gold)]">
          Defence Services College
        </h1>
        <p className="mt-1 text-xs leading-snug text-sky-100/80">
          O/L Results Analysis
        </p>
        <p className="mt-0.5 text-[11px] text-sky-100/70">
          {"\u0D85.\u0DB4\u0DDC.\u0DC3 (\u0DC3\u0DCF/\u0DB4\u0DD9\u0DC5) \u0DB4\u0DCA\u200D\u0DBB\u0DAD\u0DD2\u0DB5\u0DBD \u0DC0\u0DD2\u0DC1\u0DCA\u0DBD\u0DDA\u0DC2\u0DAB\u0DBA"}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 text-sm">
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`w-full rounded-lg px-4 py-3 text-left font-semibold transition ${
                isActive
                  ? "bg-[var(--brand-royal)] text-white shadow-[0_0_0_1px_rgba(255,210,0,0.35)]"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 text-center text-[10px] text-slate-400">
        O/L Results Analysis System
      </div>
    </aside>
  );
}
