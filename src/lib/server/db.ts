import { PrismaClient } from '../../../generated/prisma/index.ts';

function getDenoEnv(key: string): string | undefined {
	const deno = (globalThis as { Deno?: { env?: { get?: (k: string) => string | undefined } } })
		.Deno;
	return deno?.env?.get?.(key);
}

const isDenoDeploy = Boolean(getDenoEnv('DENO_DEPLOYMENT_ID'));

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma: PrismaClient = isDenoDeploy
	? new PrismaClient()
	: (globalForPrisma.__prisma ??= new PrismaClient());

