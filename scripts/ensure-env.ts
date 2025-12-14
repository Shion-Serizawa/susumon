async function ensureEnvFile(): Promise<void> {
	const envPath = new URL('../.env', import.meta.url);
	try {
		await Deno.stat(envPath);
		return;
	} catch {
		// continue
	}

	const examplePath = new URL('../.env.example', import.meta.url);
	await Deno.copyFile(examplePath, envPath);
	console.log('Created .env from .env.example');
}

await ensureEnvFile();
