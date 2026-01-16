import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const sourceDir = join(root, 'client');
const destDir = join(root, 'dist', 'client');

await mkdir(destDir, { recursive: true });

const entries = await readdir(sourceDir, { withFileTypes: true });
const copyTasks = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.svelte'))
    .map((entry) => copyFile(join(sourceDir, entry.name), join(destDir, entry.name)));

await Promise.all(copyTasks);
