import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      status: "connected",
      database: "Neon PostgreSQL",
      latencyMs: `${latencyMs}ms`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "disconnected",
        database: "Neon PostgreSQL",
        error: error.message || "Cannot connect to database. Please verify DATABASE_URL in .env",
      },
      { status: 503 }
    );
  }
}
