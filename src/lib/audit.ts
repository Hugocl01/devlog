import { prisma } from "@/lib/prisma";

export async function logAudit(
  locals: App.Locals,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: locals.user?.id ?? null,
        userEmail: locals.user?.email ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        metadata: metadata ?? undefined,
      },
    });
  } catch {
    // Audit logging is non-critical; never throw
  }
}
