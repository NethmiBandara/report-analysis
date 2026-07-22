"use client";

import { useEffect, useState } from "react";
import { ResultsApp } from "@/components/ResultsApp";

export default function Home() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  // Avoid hydrating interactive UI against browser-extension DOM mutations
  // (e.g. Grammarly / form fillers injecting fdprocessedid).
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent text-sm text-slate-500">
        Loading analysis workspace…
      </div>
    );
  }

  return <ResultsApp />;
}
