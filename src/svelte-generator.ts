import fs from 'fs/promises';
import path from 'path';
import { type Node as GltfNode, type Scene } from '@gltf-transform/core';
import { loadGltfDocument } from './gltf-io.js';

export interface SvelteExportOptions {
    assetUrl?: string;
    componentName?: string;
    outputPath?: string;
    mode?: 'nodes' | 'primitive';
}

export interface SvelteExportResult {
    componentName: string;
    assetUrl: string;
    outputPath?: string;
    nodes: number;
    meshes: number;
    warnings: string[];
    code: string;
}

const DEFAULT_POSITION: [number, number, number] = [0, 0, 0];
const DEFAULT_SCALE: [number, number, number] = [1, 1, 1];
const DEFAULT_QUATERNION: [number, number, number, number] = [0, 0, 0, 1];

export async function exportToSvelte(
    assetPath: string,
    options: SvelteExportOptions = {}
): Promise<SvelteExportResult> {
    const { document, resolvedPath } = await loadGltfDocument(assetPath);
    const root = document.getRoot();
    const scene = root.listScenes()[0];
    if (!scene) {
        throw new Error('No scenes found in GLTF.');
    }

    const componentName = options.componentName ?? toPascalCase(path.basename(resolvedPath, path.extname(resolvedPath)));
    const assetUrl = options.assetUrl ?? path.basename(resolvedPath);
    const mode = options.mode ?? 'nodes';

    const warnings: string[] = [];
    const { nodeNames, unnamedNodes, duplicateNames } = buildNodeNames(root.listNodes());

    if (unnamedNodes.length > 0) {
        warnings.push(`Found ${unnamedNodes.length} unnamed node(s). Consider naming nodes for stable exports.`);
    }
    if (duplicateNames.length > 0) {
        warnings.push(`Found ${duplicateNames.length} duplicate node name(s). Generated unique aliases.`);
    }

    const meshes = root.listMeshes().length;

    const lines: string[] = [];
    lines.push('<script lang="ts">');
    lines.push('  import { T } from \'@threlte/core\';');
    lines.push('  import { useGltf } from \'@threlte/extras\';');
    lines.push('');
    lines.push(`  const { nodes, materials, scene } = useGltf('${escapeString(assetUrl)}');`);
    lines.push('</script>');
    lines.push('');

    const sceneName = scene.getName()?.trim() || componentName;
    lines.push(`<T.Group name="${escapeString(sceneName)}">`);

    if (mode === 'primitive') {
        lines.push('  <T.Primitive object={scene} />');
    } else {
        const sceneNodes = scene.listChildren();
        if (sceneNodes.length === 0) {
            lines.push('  <T.Primitive object={scene} />');
            warnings.push('Scene has no child nodes. Exported a primitive wrapper.');
        } else {
            for (const node of sceneNodes) {
                lines.push(renderNode(node, nodeNames, 2));
            }
        }
    }

    lines.push('</T.Group>');

    const code = lines.join('\n');

    if (options.outputPath) {
        const resolvedOutput = path.resolve(options.outputPath);
        await fs.writeFile(resolvedOutput, code, 'utf8');
    }

    return {
        componentName,
        assetUrl,
        outputPath: options.outputPath,
        nodes: root.listNodes().length,
        meshes,
        warnings,
        code,
    };
}

function buildNodeNames(nodes: GltfNode[]) {
    const nodeNames = new Map<GltfNode, string>();
    const usedNames = new Map<string, number>();
    const unnamedNodes: string[] = [];
    const duplicateNames: string[] = [];

    nodes.forEach((node, index) => {
        const raw = node.getName()?.trim() || '';
        let name = raw || `Node_${index}`;
        if (!raw) {
            unnamedNodes.push(name);
        }

        const count = usedNames.get(name) ?? 0;
        if (count > 0) {
            duplicateNames.push(name);
            name = `${name}_${count + 1}`;
        }
        usedNames.set(raw || name, count + 1);
        nodeNames.set(node, name);
    });

    return { nodeNames, unnamedNodes, duplicateNames };
}

function renderNode(node: GltfNode, nodeNames: Map<GltfNode, string>, indent: number): string {
    const name = nodeNames.get(node) ?? 'Node';
    const children = node.listChildren();
    const mesh = node.getMesh();

    const props: string[] = [];
    props.push(`name="${escapeString(name)}"`);

    const translation = node.getTranslation();
    const rotation = node.getRotation();
    const scale = node.getScale();

    if (!isDefaultVector(translation, DEFAULT_POSITION)) {
        props.push(`position={${formatVector(translation)}}`);
    }
    if (!isDefaultVector(scale, DEFAULT_SCALE)) {
        props.push(`scale={${formatVector(scale)}}`);
    }
    if (!isDefaultVector(rotation, DEFAULT_QUATERNION)) {
        props.push(`quaternion={${formatVector(rotation)}}`);
    }

    const indentStr = ' '.repeat(indent);
    const childIndent = ' '.repeat(indent + 2);

    if (mesh) {
        props.push(`geometry={nodes["${escapeString(name)}"].geometry}`);
        props.push(`material={nodes["${escapeString(name)}"].material}`);
        if (children.length === 0) {
            return `${indentStr}<T.Mesh ${props.join(' ')} />`;
        }
        const lines = [`${indentStr}<T.Mesh ${props.join(' ')}>`];
        for (const child of children) {
            lines.push(renderNode(child, nodeNames, indent + 2));
        }
        lines.push(`${indentStr}</T.Mesh>`);
        return lines.join('\n');
    }

    if (children.length === 0) {
        props.push(`object={nodes["${escapeString(name)}"]}`);
        return `${indentStr}<T.Primitive ${props.join(' ')} />`;
    }

    const lines = [`${indentStr}<T.Group ${props.join(' ')}>`];
    for (const child of children) {
        lines.push(renderNode(child, nodeNames, indent + 2));
    }
    lines.push(`${indentStr}</T.Group>`);
    return lines.join('\n');
}

function formatVector(values: readonly number[]) {
    const formatted = values.map((value) => {
        const rounded = Math.round(value * 10000) / 10000;
        return Number.isInteger(rounded) ? rounded.toString() : rounded.toString();
    });
    return `[${formatted.join(', ')}]`;
}

function isDefaultVector(values: readonly number[], defaults: readonly number[]) {
    return values.length === defaults.length && values.every((value, index) => Math.abs(value - defaults[index]) < 1e-5);
}

function toPascalCase(input: string) {
    return input
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join('') || 'GltfModel';
}

function escapeString(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
