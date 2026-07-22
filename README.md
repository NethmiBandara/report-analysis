# O/L Results Analysis

A Next.js app for analysing G.C.E. Ordinary Level (O/L) examination results from Excel workbooks. Upload school result sheets, view dashboards and subject breakdowns, compare years, and export summaries.

Built for school-level reporting (e.g. Defence Services College–style O/L sheets).

## Features

- Upload and parse O/L results Excel files
- Dashboard: pass rates, grade distribution, gender/medium splits
- Per-subject analysis and student tables
- Best-performance highlights
- Year-over-year comparison (saved locally under `data/`)
- Download / export panels for reports
- Sample workbook included: `public/sample-ol-results.xlsx`

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- [Recharts](https://recharts.org) for charts
- [SheetJS (xlsx)](https://sheetjs.com) for Excel parsing

## Getting started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) (recommended)

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
pnpm build
pnpm start
```

### Lint

```bash
pnpm lint
```

## Sample data

A sample Excel file is available at `public/sample-ol-results.xlsx`. You can regenerate it with:

```bash
node scripts/make-sample.mjs
```

## Data storage

Uploaded/saved year results are stored as JSON under `data/` (e.g. `year-2026.json`). These files are gitignored so local exam data is not committed. Only `data/.gitkeep` is tracked.

## Project structure

```
app/           # Next.js app router pages and API routes
components/    # UI (dashboard, tables, compare, etc.)
lib/           # Parsing, analysis, DB helpers, types
data/          # Local year JSON (ignored except .gitkeep)
public/        # Static assets and sample Excel
scripts/       # Sample generation and parse tests
```

## License

Private project (`"private": true` in `package.json`).
