import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
	extends: './vite.config.ts',
	test: {
		expect: { requireAssertions: true },
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [{ browser: 'chromium', headless: true }]
		},
		include: [
			'src/**/*.svelte.spec.ts',
			'src/**/*.svelte.test.ts',
			'src/**/*.svelte.spec.js',
			'src/**/*.svelte.test.js'
		],
		exclude: ['src/lib/server/**']
	}
});
