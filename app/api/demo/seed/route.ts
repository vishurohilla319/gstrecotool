import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { seedDemoData } from "@/lib/seed-data";
import { logActivity } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await seedDemoData(user.organizationId);

    if (user.organizationId) {
      await logActivity({
        organizationId: user.organizationId,
        userId: user.userId,
        action: "LOAD_DEMO_DATA",
        entity: "System",
        details: "Loaded comprehensive Indian GST demo dataset across Books, 2A, 2B, 3B",
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Demo seed error:", error);
    return NextResponse.json({ error: error.message || "Failed to seed demo data" }, { status: 500 });
  }
}
