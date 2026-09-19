import { NextResponse } from "next/server";
import { parseGstr3BPdf } from "@/lib/pdf-3b-parser";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Session expired. Please log in again." },
        { status: 200 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No PDF file provided" },
        { status: 200 }
      );
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
    return NextResponse.json(
      { success: false, error: error.message || "Failed to parse GSTR-3B PDF" },
      { status: 200 }
    );
  }
}
