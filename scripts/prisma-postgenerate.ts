/**
 * Prisma Client post-generate fixups for Deno/Vite SSR.
 *
 * Prisma generates CommonJS (`index.js`) into `.prisma/client`.
 * Deno treats `.js` as ESM unless the nearest package.json sets `"type": "commonjs"`,
 * which causes runtime errors like: "ReferenceError: exports is not defined".
 */

const prismaClientPkgJsonPath = new URL('../.prisma/client/package.json', import.meta.url);

type PrismaClientPackageJson = {
	type?: string;
	[key: string]: unknown;
};

let text: string;
try {
	text = await Deno.readTextFile(prismaClientPkgJsonPath);
} catch (error) {
	// If Prisma hasn't been generated yet, do nothing.
	if (error instanceof Deno.errors.NotFound) {
		Deno.exit(0);
	}
	throw error;
}

const pkg = JSON.parse(text) as PrismaClientPackageJson;
if (pkg.type !== 'commonjs') {
	pkg.type = 'commonjs';
	await Deno.writeTextFile(prismaClientPkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
}

