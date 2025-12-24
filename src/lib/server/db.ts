// Prisma v7 with PostgreSQL adapter for Deno Deploy
import prismaClientPkg from '@prisma/client';
const { PrismaClient, Prisma } = prismaClientPkg;
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

function getDenoEnv(key: string): string | undefined {
	const deno = (globalThis as { Deno?: { env?: { get?: (k: string) => string | undefined } } })
		.Deno;
	return deno?.env?.get?.(key);
}

function getNodeEnv(key: string): string | undefined {
	const process = (globalThis as { process?: { env?: Record<string, string | undefined> } })
		.process;
	return process?.env?.[key];
}

function getEnv(key: string): string | undefined {
	return getDenoEnv(key) ?? getNodeEnv(key);
}

const isDenoDeploy = Boolean(getDenoEnv('DENO_DEPLOYMENT_ID'));

/**
 * Prisma Client with multi-tenant boundary protection and state-aware queries
 */
const createPrismaClient = () => {
	// Get DATABASE_URL from environment
	const databaseUrl = getEnv('DATABASE_URL');
	if (!databaseUrl) {
		throw new Error('DATABASE_URL environment variable is not set');
	}

	// Create PostgreSQL connection pool
	const pool = new pg.Pool({ connectionString: databaseUrl });

	// Create Prisma adapter
	const adapter = new PrismaPg(pool);

	// Initialize Prisma Client with adapter
	const client = new PrismaClient({ adapter });

	return client.$extends({
		name: 'multiTenantGuard',
		query: {
			// Theme operations: enforce userId scope and filter by state
			theme: {
				async findMany({ args, query }) {
					// Require userId in where clause (application-level enforcement)
					if (!args.where?.userId) {
						throw new Error('SECURITY: Theme.findMany requires userId in where clause');
					}
					// Auto-filter DELETED unless explicitly requested
					if (args.where.state === undefined) {
						args.where = { ...args.where, state: { not: 'DELETED' } };
					}
					return query(args);
				},
				async findFirst({ args, query }) {
					if (!args.where?.userId) {
						throw new Error('SECURITY: Theme.findFirst requires userId in where clause');
					}
					if (args.where.state === undefined) {
						args.where = { ...args.where, state: { not: 'DELETED' } };
					}
					return query(args);
				},
				async findUnique({ args, query }) {
					// findUnique uses 'where: { id }', so we need special handling
					// For now, we'll let it pass and rely on post-query userId check in routes
					return query(args);
				},
			},

			// LearningLogEntry operations
			learningLogEntry: {
				async findMany({ args, query }) {
					if (!args.where?.userId) {
						throw new Error('SECURITY: LearningLogEntry.findMany requires userId in where clause');
					}
					if (args.where.state === undefined) {
						args.where = { ...args.where, state: { not: 'DELETED' } };
					}
					return query(args);
				},
				async findFirst({ args, query }) {
					if (!args.where?.userId) {
						throw new Error('SECURITY: LearningLogEntry.findFirst requires userId in where clause');
					}
					if (args.where.state === undefined) {
						args.where = { ...args.where, state: { not: 'DELETED' } };
					}
					return query(args);
				},
			},

			// MetaNote operations
			metaNote: {
				async findMany({ args, query }) {
					if (!args.where?.userId) {
						throw new Error('SECURITY: MetaNote.findMany requires userId in where clause');
					}
					if (args.where.state === undefined) {
						args.where = { ...args.where, state: { not: 'DELETED' } };
					}
					return query(args);
				},
				async findFirst({ args, query }) {
					if (!args.where?.userId) {
						throw new Error('SECURITY: MetaNote.findFirst requires userId in where clause');
					}
					if (args.where.state === undefined) {
						args.where = { ...args.where, state: { not: 'DELETED' } };
					}
					return query(args);
				},
			},
		},
	});
};

const globalForPrisma = globalThis as unknown as { __prisma?: ReturnType<typeof createPrismaClient> };

export const prisma = isDenoDeploy
	? createPrismaClient()
	: (globalForPrisma.__prisma ??= createPrismaClient());

