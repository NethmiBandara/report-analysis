import { NextResponse } from "next/server";
import { listYears, saveYear } from "@/lib/db";
import type { Student } from "@/lib/types";
import { isValidYear } from "@/lib/yearUtils";

export const runtime = "nodejs";

export async function GET() {
  try {
    const years = await listYears();
    return NextResponse.json({ years });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to list saved years." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      year?: string;
      examTitle?: string;
      schoolName?: string;
      students?: Student[];
    };

    const year = String(body.year ?? "").trim();
    if (!isValidYear(year)) {
      return NextResponse.json(
        { error: "Provide a valid exam year (e.g. 2025)." },
        { status: 400 },
      );
    }
    if (!Array.isArray(body.students) || body.students.length === 0) {
      return NextResponse.json(
        { error: "No students to save." },
        { status: 400 },
      );
    }

    const record = await saveYear({
      year,
      examTitle: body.examTitle || `G.C.E. (Ordinary Level) ${year}`,
      schoolName: body.schoolName || "Defence Services College",
      students: body.students,
    });

    return NextResponse.json({
      ok: true,
      year: record.year,
      studentCount: record.studentCount,
      summary: {
        passPercent: record.summary.passPercent,
        failPercent: record.summary.failPercent,
        passCount: record.summary.passCount,
        failCount: record.summary.failCount,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to save results.",
      },
      { status: 500 },
    );
  }
}
