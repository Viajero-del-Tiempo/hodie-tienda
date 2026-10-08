import { mkdir, copyFile } from 'node:fs/promises';

export async function configureEmulator() {
  const directory = new URL('../src/environments/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await copyFile(new URL('../dev/environment.emulator.ts', import.meta.url),
    new URL('environment.emulator.ts', directory));
}
await configureEmulator();
