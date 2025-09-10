import { PrismaClient } from "@prisma/client";
import path from "path";

// Force an absolute sqlite path for runtime (Next runs from apps/web)
if (process.env.DATABASE_URL?.startsWith("file:")) {
  const url = process.env.DATABASE_URL.slice(5); // after "file:"
  const isAbs = url.startsWith("/") || url.startsWith("\\");
  if (!isAbs) {
    const abs = path.join(process.cwd(), url); // resolve relative to apps/web
    process.env.DATABASE_URL = `file:${abs}`;
  }
}

const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
