/**
 * ESM wrapper for Prisma Client
 *
 * Prisma v7 generates CommonJS code, but Vite SSR expects ESM.
 * This wrapper uses Node-compat `require` to load the CommonJS module
 * and re-exports it as ESM.
 */

import { createRequire } from 'node:module';

type PrismaClientModule = typeof import('../../../.prisma/client/index.js');

export type {
	LearningLogEntry,
	MetaNote,
	MetaNoteTheme,
	Theme,
} from '../../../.prisma/client/index.js';

const require = createRequire(import.meta.url);
const client = require('../../../.prisma/client/index.js') as PrismaClientModule;

// Re-export named exports
export const PrismaClient: PrismaClientModule['PrismaClient'] = (client as PrismaClientModule)
	.PrismaClient;
export const Prisma: PrismaClientModule['Prisma'] = (client as PrismaClientModule).Prisma;
