import { defineConfig } from 'vitest/config';

export default defineConfig({
	extends: './vite.config.ts',
	test: {
		expect: { requireAssertions: true },
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
	}
});
