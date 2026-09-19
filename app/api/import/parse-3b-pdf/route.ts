import { NextResponse } from "next/server";
import { parseGstr3BPdf } from "@/lib/pdf-3b-parser";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireUser();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await parseGstr3BPdf(buffer);

    return NextResponse.json({
      success: true,
      data: parsed,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error("parse-3b-pdf error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse GSTR-3B PDF" }, { status: 500 });
  }
}
