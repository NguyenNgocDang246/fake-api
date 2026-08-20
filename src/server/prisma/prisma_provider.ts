import { PrismaClient } from "@prisma/client";

// Next.js re-evaluates modules on every hot reload in dev, so a bare `new PrismaClient()`
// leaks one connection pool per reload. Keep the instance on globalThis outside production.
const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env["NODE_ENV"] !== "production") globalForPrisma.prisma = prisma;
