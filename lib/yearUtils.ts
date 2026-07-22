/** Pull exam year from titles like "G.C.E. ... 2025(2026)" → "2025" */
export function extractExamYear(examTitle: string, fallback?: string): string {
  const text = examTitle || "";
  const withParen = text.match(/\b(20\d{2})\s*\(\s*20\d{2}\s*\)/);
  if (withParen) return withParen[1];
  const years = text.match(/\b(20\d{2})\b/g);
  if (years?.length) return years[0];
  if (fallback && /^20\d{2}$/.test(fallback)) return fallback;
  return String(new Date().getFullYear());
}

export function isValidYear(year: string): boolean {
  return /^20\d{2}$/.test(year.trim());
}
