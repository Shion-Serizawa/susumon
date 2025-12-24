/**
 * ESM wrapper for Prisma Client
 *
 * Prisma v7 generates CommonJS code, but Vite SSR expects ESM.
 * This wrapper uses dynamic import to load the CommonJS module
 * and re-exports it as ESM.
 */

// Use dynamic import to load CommonJS module
const clientModule = await import('../../../.prisma/client/index.js');

// Re-export named exports
export const { PrismaClient, Prisma } = clientModule;
