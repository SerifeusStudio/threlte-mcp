import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    NodeIO,
    type Document,
    type Node as GltfNode,
    type Primitive,
    type Scene,
} from '@gltf-transform/core';
import { inspect } from '@gltf-transform/functions';

const io = new NodeIO();

const SUPPORTED_EXTENSIONS = new Set(['.gltf', '.glb']);
const KNOWN_ATTRIBUTES = [
    'POSITION',
    'NORMAL',
    'TANGENT',
    'TEXCOORD_0',
    'TEXCOORD_1',
    'COLOR_0',
    'JOINTS_0',
    'WEIGHTS_0',
];
const MODE_LABELS: Record<number, string> = {
    0: 'POINTS',
    1: 'LINES',
    2: 'LINE_LOOP',
    3: 'LINE_STRIP',
    4: 'TRIANGLES',
    5: 'TRIANGLE_STRIP',
    6: 'TRIANGLE_FAN',
};

export interface GltfMeshPrimitiveSummary {
    mode: string;
    vertices: number;
    triangles: number;
    attributes: string[];
}

export interface GltfMeshSummary {
    name: string | null;
    primitiveCount: number;
    estimatedVertices: number;
    estimatedTriangles: number;
    attributes: string[];
    primitives: GltfMeshPrimitiveSummary[];
}

export interface GltfSceneSummary {
    name: string | null;
    nodeCount: number;
}

export interface GltfMaterialSummary {
    name: string | null;
    alphaMode: string;
    doubleSided: boolean;
}

export interface GltfTextureSummary {
    name: string | null;
    mimeType: string | null;
}

export interface GltfAnimationSummary {
    name: string | null;
    channels: number;
    samplers: number;
}

export interface GltfAnalysisSummary {
    scenes: number;
    nodes: number;
    meshes: number;
    materials: number;
    textures: number;
    animations: number;
    skins: number;
    drawCalls: number;
    estimatedVertices: number;
    estimatedTriangles: number;
}

export interface GltfAnalysis {
    source: {
        path: string;
        bytes: number;
    };
    summary: GltfAnalysisSummary;
    scenes: GltfSceneSummary[];
    meshes: GltfMeshSummary[];
    materials: GltfMaterialSummary[];
    textures: GltfTextureSummary[];
    animations: GltfAnimationSummary[];
    inspection: unknown | null;
}

export interface GltfValidationLimits {
    maxDrawCalls: number;
    maxTriangles: number;
    maxVertices: number;
    maxTextures: number;
    maxMaterials: number;
    maxAnimations: number;
}

export interface GltfValidationReport {
    source: {
        path: string;
        bytes: number;
    };
    valid: boolean;
    errors: string[];
    warnings: string[];
    metrics: GltfAnalysisSummary;
    limits: GltfValidationLimits;
    issues: {
        missingPosition: string[];
    };
    inspection: unknown | null;
}

const DEFAULT_LIMITS: GltfValidationLimits = {
    maxDrawCalls: 200,
    maxTriangles: 200_000,
    maxVertices: 400_000,
    maxTextures: 12,
    maxMaterials: 50,
    maxAnimations: 200,
};

function normalizeName(name: string | null | undefined): string | null {
    const trimmed = name?.trim();
    return trimmed ? trimmed : null;
}

function resolveAssetPath(input: string): string {
    if (/^https?:\/\//i.test(input)) {
        throw new Error('Remote URLs are not supported. Provide a local file path or file:// URL.');
    }

    if (input.startsWith('file://')) {
        return fileURLToPath(input);
    }

    return path.normalize(input);
}

async function loadDocument(assetPath: string) {
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
    } catch (error) {
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

function countSceneNodes(scene: Scene): number {
    let count = 0;
    const visit = (node: GltfNode) => {
        count += 1;
        for (const child of node.listChildren()) {
            visit(child);
        }
    };

    for (const child of scene.listChildren()) {
        visit(child);
    }

    return count;
}

function estimateTriangles(primitive: Primitive, vertexCount: number, indexCount: number): number {
    const mode = primitive.getMode();
    const count = indexCount > 0 ? indexCount : vertexCount;

    if (mode === 4) {
        return Math.floor(count / 3);
    }

    if (mode === 5 || mode === 6) {
        return Math.max(0, count - 2);
    }

    return 0;
}

function collectMeshSummaries(document: Document) {
    const root = document.getRoot();
    const meshes = root.listMeshes();
    const missingPosition: string[] = [];

    let totalPrimitives = 0;
    let totalVertices = 0;
    let totalTriangles = 0;

    const meshSummaries = meshes.map((mesh, meshIndex) => {
        const meshName = normalizeName(mesh.getName());
        const meshLabel = meshName ?? `mesh_${meshIndex}`;
        const primitives = mesh.listPrimitives();

        const primitiveSummaries = primitives.map((primitive, primitiveIndex) => {
            const position = primitive.getAttribute('POSITION');
            if (!position) {
                missingPosition.push(`${meshLabel}:primitive_${primitiveIndex}`);
            }

            const vertexCount = position ? position.getCount() : 0;
            const indices = primitive.getIndices();
            const indexCount = indices ? indices.getCount() : 0;
            const triangleCount = estimateTriangles(primitive, vertexCount, indexCount);
            const attributes = KNOWN_ATTRIBUTES.filter(
                (attribute) => primitive.getAttribute(attribute) !== null
            );
            const modeValue = primitive.getMode();
            const mode = MODE_LABELS[modeValue] ?? `MODE_${modeValue}`;

            totalPrimitives += 1;
            totalVertices += vertexCount;
            totalTriangles += triangleCount;

            return {
                mode,
                vertices: vertexCount,
                triangles: triangleCount,
                attributes,
            };
        });

        const attributes = Array.from(
            new Set(primitiveSummaries.flatMap((summary) => summary.attributes))
        );
        const meshVertices = primitiveSummaries.reduce(
            (sum, summary) => sum + summary.vertices,
            0
        );
        const meshTriangles = primitiveSummaries.reduce(
            (sum, summary) => sum + summary.triangles,
            0
        );

        return {
            name: meshName,
            primitiveCount: primitives.length,
            estimatedVertices: meshVertices,
            estimatedTriangles: meshTriangles,
            attributes,
            primitives: primitiveSummaries,
        };
    });

    return {
        meshSummaries,
        totalPrimitives,
        totalVertices,
        totalTriangles,
        missingPosition,
    };
}

function normalizeLimits(limits?: Partial<GltfValidationLimits>): GltfValidationLimits {
    if (!limits) {
        return { ...DEFAULT_LIMITS };
    }

    const sanitized = Object.fromEntries(
        Object.entries(limits).filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    ) as Partial<GltfValidationLimits>;

    return {
        ...DEFAULT_LIMITS,
        ...sanitized,
    };
}

async function safeInspect(document: Document): Promise<unknown | null> {
    try {
        const result = inspect(document) as unknown;
        if (result && typeof (result as { then?: unknown }).then === 'function') {
            return await (result as Promise<unknown>);
        }
        return result;
    } catch {
        return null;
    }
}

async function buildAnalysis(document: Document, resolvedPath: string, bytes: number) {
    const root = document.getRoot();
    const { meshSummaries, totalPrimitives, totalVertices, totalTriangles, missingPosition } =
        collectMeshSummaries(document);

    const scenes = root.listScenes().map((scene) => ({
        name: normalizeName(scene.getName()),
        nodeCount: countSceneNodes(scene),
    }));

    const materials = root.listMaterials().map((material) => ({
        name: normalizeName(material.getName()),
        alphaMode: material.getAlphaMode(),
        doubleSided: material.getDoubleSided(),
    }));

    const textures = root.listTextures().map((texture) => ({
        name: normalizeName(texture.getName()),
        mimeType: texture.getMimeType(),
    }));

    const animations = root.listAnimations().map((animation) => ({
        name: normalizeName(animation.getName()),
        channels: animation.listChannels().length,
        samplers: animation.listSamplers().length,
    }));

    const summary: GltfAnalysisSummary = {
        scenes: scenes.length,
        nodes: root.listNodes().length,
        meshes: meshSummaries.length,
        materials: materials.length,
        textures: textures.length,
        animations: animations.length,
        skins: root.listSkins().length,
        drawCalls: totalPrimitives,
        estimatedVertices: totalVertices,
        estimatedTriangles: totalTriangles,
    };

    const analysis: GltfAnalysis = {
        source: {
            path: resolvedPath,
            bytes,
        },
        summary,
        scenes,
        meshes: meshSummaries,
        materials,
        textures,
        animations,
        inspection: await safeInspect(document),
    };

    return { analysis, missingPosition };
}

export async function analyzeGltf(assetPath: string): Promise<GltfAnalysis> {
    const { document, resolvedPath, bytes } = await loadDocument(assetPath);
    return (await buildAnalysis(document, resolvedPath, bytes)).analysis;
}

export async function validateGltf(
    assetPath: string,
    limits?: Partial<GltfValidationLimits>
): Promise<GltfValidationReport> {
    const { document, resolvedPath, bytes } = await loadDocument(assetPath);
    const { analysis, missingPosition } = await buildAnalysis(document, resolvedPath, bytes);
    const normalizedLimits = normalizeLimits(limits);

    const errors: string[] = [];
    const warnings: string[] = [];

    if (analysis.summary.scenes === 0) {
        errors.push('No scenes found.');
    }

    if (analysis.summary.meshes === 0) {
        warnings.push('No meshes found.');
    }

    if (missingPosition.length > 0) {
        errors.push(`Missing POSITION attribute in ${missingPosition.length} primitive(s).`);
    }

    if (analysis.summary.drawCalls > normalizedLimits.maxDrawCalls) {
        warnings.push(
            `High draw call count (${analysis.summary.drawCalls}). Target <= ${normalizedLimits.maxDrawCalls}.`
        );
    }

    if (analysis.summary.estimatedTriangles > normalizedLimits.maxTriangles) {
        warnings.push(
            `High triangle count (${analysis.summary.estimatedTriangles}). Target <= ${normalizedLimits.maxTriangles}.`
        );
    }

    if (analysis.summary.estimatedVertices > normalizedLimits.maxVertices) {
        warnings.push(
            `High vertex count (${analysis.summary.estimatedVertices}). Target <= ${normalizedLimits.maxVertices}.`
        );
    }

    if (analysis.summary.textures > normalizedLimits.maxTextures) {
        warnings.push(
            `High texture count (${analysis.summary.textures}). Target <= ${normalizedLimits.maxTextures}.`
        );
    }

    if (analysis.summary.materials > normalizedLimits.maxMaterials) {
        warnings.push(
            `High material count (${analysis.summary.materials}). Target <= ${normalizedLimits.maxMaterials}.`
        );
    }

    if (analysis.summary.animations > normalizedLimits.maxAnimations) {
        warnings.push(
            `High animation count (${analysis.summary.animations}). Target <= ${normalizedLimits.maxAnimations}.`
        );
    }

    return {
        source: {
            path: resolvedPath,
            bytes,
        },
        valid: errors.length === 0,
        errors,
        warnings,
        metrics: analysis.summary,
        limits: normalizedLimits,
        issues: {
            missingPosition,
        },
        inspection: analysis.inspection,
    };
}
