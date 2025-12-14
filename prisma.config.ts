import { defineConfig, env } from 'prisma/config';
import { join } from '@std/path';

export default defineConfig({
	engine: 'classic',
	schema: join('prisma', 'schema.prisma'),
	migrations: { path: join('prisma', 'migrations') },
	datasource: { url: env('DATABASE_URL') }
});
