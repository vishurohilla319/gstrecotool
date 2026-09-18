import { prisma } from "./prisma";

export async function logActivity({
  organizationId,
  userId,
  action,
  entity,
  details,
  ipAddress,
}: {
  organizationId: string;
  userId?: string | null;
  action: string;
  entity: string;
  details?: string;
  ipAddress?: string;
}) {
  try {
    return await prisma.activityLog.create({
      data: {
        organizationId,
        userId: userId || null,
        action,
        entity,
        details: details || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    return null;
  }
}
