async function run(cmd: string[], opts?: { cwd?: string }): Promise<void> {
	const command = new Deno.Command(cmd[0], {
		args: cmd.slice(1),
		stdout: 'inherit',
		stderr: 'inherit',
		stdin: 'inherit',
		cwd: opts?.cwd
	});
	const result = await command.output();
	if (!result.success) {
		throw new Error(`Command failed: ${cmd.join(' ')}`);
	}
}

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

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

await ensureEnvFile();

console.log('Starting Postgres via docker compose...');
await run(['docker', 'compose', 'up', '-d', 'postgres']);

console.log('Waiting for Postgres to be ready (10s)...');
await sleep(10_000);

console.log('Running migrations...');
await run(['deno', 'task', 'db:migrate:dev']);

console.log('Setup complete.');

