import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";

function buildIpHash(ip: string, date: string, id: number) {
  return crypto
    .createHash("sha256")
    .update(`${ip}:${date}:${id}`)
    .digest("hex")
    .slice(0, 16);
}

export async function registerView(postId: number, request: Request): Promise<number> {
  const ip = getClientIp(request);
  const today = new Date().toISOString().slice(0, 10);
  const ipHash = buildIpHash(ip, today, postId);
  const startOfDay = new Date(`${today}T00:00:00.000Z`);

  const already = await prisma.postView.findFirst({
    where: { postId, ipHash, viewedAt: { gte: startOfDay } },
    select: { id: true },
  });

  if (!already) {
    await prisma.postView.create({
      data: { postId, ipHash, userAgent: request.headers.get("user-agent")?.slice(0, 255) ?? null },
    });
  }

  return prisma.postView.count({ where: { postId } });
}

export async function registerUpdateView(updateId: number, request: Request): Promise<number> {
  const ip = getClientIp(request);
  const today = new Date().toISOString().slice(0, 10);
  const ipHash = buildIpHash(ip, today, updateId);
  const startOfDay = new Date(`${today}T00:00:00.000Z`);

  const already = await prisma.updateView.findFirst({
    where: { updateId, ipHash, viewedAt: { gte: startOfDay } },
    select: { id: true },
  });

  if (!already) {
    await prisma.updateView.create({
      data: { updateId, ipHash, userAgent: request.headers.get("user-agent")?.slice(0, 255) ?? null },
    });
  }

  return prisma.updateView.count({ where: { updateId } });
}
