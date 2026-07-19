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
  const userAgent = request.headers.get("user-agent")?.slice(0, 255) ?? null;

  await prisma.postView.upsert({
    where: { postId_ipHash: { postId, ipHash } },
    create: { postId, ipHash, userAgent },
    update: {},
  });

  return prisma.postView.count({ where: { postId } });
}

export async function registerUpdateView(updateId: number, request: Request): Promise<number> {
  const ip = getClientIp(request);
  const today = new Date().toISOString().slice(0, 10);
  const ipHash = buildIpHash(ip, today, updateId);
  const userAgent = request.headers.get("user-agent")?.slice(0, 255) ?? null;

  await prisma.updateView.upsert({
    where: { updateId_ipHash: { updateId, ipHash } },
    create: { updateId, ipHash, userAgent },
    update: {},
  });

  return prisma.updateView.count({ where: { updateId } });
}
