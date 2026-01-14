import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { NodeIO, type Document } from '@gltf-transform/core';

const io = new NodeIO();
const SUPPORTED_EXTENSIONS = new Set(['.gltf', '.glb']);

export interface GltfDocumentLoadResult {
    document: Document;
    resolvedPath: string;
    bytes: number;
}

export function resolveAssetPath(input: string): string {
    if (/^https?:\/\//i.test(input)) {
        throw new Error('Remote URLs are not supported. Provide a local file path or file:// URL.');
    }

    if (input.startsWith('file://')) {
        return fileURLToPath(input);
    }

    return path.normalize(input);
}

export function resolveOutputPath(inputPath: string, outputPath?: string, suffix = '-optimized'): string {
    if (outputPath) {
        const resolvedOutput = resolveAssetPath(outputPath);
        const extension = path.extname(resolvedOutput);
        if (extension) {
            return resolvedOutput;
        }
        const inputExtension = path.extname(inputPath) || '.glb';
        return `${resolvedOutput}${inputExtension}`;
    }

    const extension = path.extname(inputPath);
    const baseName = path.basename(inputPath, extension);
    const dirName = path.dirname(inputPath);
    return path.join(dirName, `${baseName}${suffix}${extension || '.glb'}`);
}

export async function loadGltfDocument(assetPath: string): Promise<GltfDocumentLoadResult> {
    if (!assetPath || typeof assetPath !== 'string') {
        throw new Error('path is required');
    }

    const resolvedPath = resolveAssetPath(assetPath);
    const extension = path.extname(resolvedPath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
        throw new Error(`Unsupported extension "${extension}". Expected .gltf or .glb.`);
    }

    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
        stat = await fs.stat(resolvedPath);
    } catch {
        throw new Error(`File not found: ${resolvedPath}`);
    }

    if (!stat.isFile()) {
        throw new Error(`Not a file: ${resolvedPath}`);
    }

    try {
        const document = await io.read(resolvedPath);
        return { document, resolvedPath, bytes: stat.size };
    } catch (error) {
        throw new Error(
            `Failed to read glTF: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

export async function writeGltfDocument(document: Document, outputPath: string): Promise<number> {
    const resolvedOutput = resolveAssetPath(outputPath);
    await io.write(resolvedOutput, document);
    const stat = await fs.stat(resolvedOutput);
    return stat.size;
}
