import { NextResponse } from "next/server";
import { deleteYear, getYear } from "@/lib/db";
import { isValidYear } from "@/lib/yearUtils";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ year: string }> },
) {
  try {
    const { year } = await context.params;
    if (!isValidYear(year)) {
      return NextResponse.json({ error: "Invalid year." }, { status: 400 });
    }

    const record = await getYear(year);
    if (!record) {
      return NextResponse.json({ error: "Year not found." }, { status: 404 });
    }

    return NextResponse.json({ record });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load year." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ year: string }> },
) {
  try {
    const { year } = await context.params;
    if (!isValidYear(year)) {
      return NextResponse.json({ error: "Invalid year." }, { status: 400 });
    }

    const ok = await deleteYear(year);
    if (!ok) {
      return NextResponse.json({ error: "Year not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete year." },
      { status: 500 },
    );
  }
}
