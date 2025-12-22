import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		// Let Vite transform .prisma/client from CommonJS to ESM
		noExternal: ['.prisma/client']
	}
});
