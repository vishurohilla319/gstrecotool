import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();

  if (user?.organizationId) {
    await logActivity({
      organizationId: user.organizationId,
      userId: user.userId,
      action: "LOGOUT",
      entity: "User",
      details: `User ${user.email} signed out`,
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
