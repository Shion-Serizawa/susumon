import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
	extends: './vite.config.ts',
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib')
		}
	},
	test: {
		expect: { requireAssertions: true },
		environment: 'node',
		include: ['src/tests/**/*.{test,spec}.{js,ts}'],
		exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
		// Disable parallel execution to avoid database conflicts
		fileParallelism: false,
		// Environment variables for tests
		env: {
			DATABASE_URL: 'postgresql://susumon:susumon_dev_password@127.0.0.1:5500/susumon_dev',
			USE_MOCK_AUTH: 'true',
			DEV_MODE: 'true',
			NODE_ENV: 'test'
		}
	}
});
