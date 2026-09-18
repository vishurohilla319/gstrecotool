import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          email: cleanEmail,
          token,
          expiresAt,
        },
      });

      // In production with email provider (e.g. Resend, Sendgrid), send email here.
      // For developer ease, log token to console.
      console.log(`[PASSWORD_RESET] Token for ${cleanEmail}: ${token}`);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "If your email is registered, you will receive reset instructions.",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
