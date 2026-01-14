import {
    type Document,
    type Node as GltfNode,
    type Primitive,
    type Scene,
} from '@gltf-transform/core';
import { dedup, inspect, prune, quantize, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { loadGltfDocument, resolveOutputPath, writeGltfDocument } from './gltf-io.js';
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

export interface GltfOptimizationSimplifyOptions {
    ratio?: number;
    error?: number;
    lockBorder?: boolean;
}

export interface GltfOptimizationTextureOptions {
    format?: 'jpeg' | 'png' | 'webp' | 'avif';
    resize?: [number, number] | 'nearest-pot' | 'ceil-pot' | 'floor-pot';
    quality?: number;
    useSharp?: boolean;
}

export interface GltfOptimizationOptions {
    outputPath?: string;
    dedup?: boolean;
    prune?: boolean;
    weld?: boolean;
    quantize?: boolean;
    simplify?: GltfOptimizationSimplifyOptions;
    textures?: GltfOptimizationTextureOptions;
}

export interface GltfOptimizationReport {
    source: {
        path: string;
        bytes: number;
    };
    output: {
        path: string;
        bytes: number;
        bytesSaved: number;
        percentSaved: number;
    };
    actions: string[];
    warnings: string[];
    summary: GltfAnalysisSummary;
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
    const { document, resolvedPath, bytes } = await loadGltfDocument(assetPath);
    return (await buildAnalysis(document, resolvedPath, bytes)).analysis;
}

export async function validateGltf(
    assetPath: string,
    limits?: Partial<GltfValidationLimits>
): Promise<GltfValidationReport> {
    const { document, resolvedPath, bytes } = await loadGltfDocument(assetPath);
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

async function loadMeshoptSimplifier(warnings: string[]): Promise<unknown | null> {
    try {
        const module = await import('meshoptimizer');
        const simplifier = module.MeshoptSimplifier ?? module.default?.MeshoptSimplifier;
        if (!simplifier) {
            warnings.push('Meshoptimizer simplifier not available. Skipping simplify.');
            return null;
        }
        if ('ready' in simplifier && typeof simplifier.ready?.then === 'function') {
            await simplifier.ready;
        }
        return simplifier;
    } catch (error) {
        warnings.push(
            `Meshoptimizer not available. Skipping simplify. (${error instanceof Error ? error.message : String(error)})`
        );
        return null;
    }
}

async function loadSharpEncoder(warnings: string[]): Promise<unknown | null> {
    try {
        const module = await import('sharp');
        return module.default ?? module;
    } catch (error) {
        warnings.push(
            `Sharp encoder not available. Texture compression will use fallback. (${error instanceof Error ? error.message : String(error)})`
        );
        return null;
    }
}

export async function optimizeGltf(
    assetPath: string,
    options: GltfOptimizationOptions = {}
): Promise<GltfOptimizationReport> {
    const { document, resolvedPath, bytes } = await loadGltfDocument(assetPath);
    const outputPath = resolveOutputPath(resolvedPath, options.outputPath);

    const actions: string[] = [];
    const warnings: string[] = [];

    const transforms = [];

    const dedupEnabled = options.dedup ?? true;
    if (dedupEnabled) {
        transforms.push(dedup());
        actions.push('dedup');
    }

    const weldEnabled = options.weld ?? true;
    if (weldEnabled) {
        transforms.push(weld());
        actions.push('weld');
    }

    const quantizeEnabled = options.quantize ?? true;
    if (quantizeEnabled) {
        transforms.push(quantize());
        actions.push('quantize');
    }

    if (options.simplify) {
        const ratio = options.simplify.ratio ?? 0.75;
        const error = options.simplify.error ?? 0.001;
        const lockBorder = options.simplify.lockBorder ?? false;

        if (ratio <= 0 || ratio >= 1) {
            warnings.push('Simplify ratio must be between 0 and 1. Skipping simplify.');
        } else {
            const simplifier = await loadMeshoptSimplifier(warnings);
            if (simplifier) {
                transforms.push(simplify({ simplifier, ratio, error, lockBorder }));
                actions.push(`simplify(ratio=${ratio},error=${error})`);
            }
        }
    }

    const pruneEnabled = options.prune ?? true;
    if (pruneEnabled) {
        transforms.push(prune());
        actions.push('prune');
    }

    const textures = options.textures;
    if (textures) {
        const root = document.getRoot();
        if (root.listTextures().length === 0) {
            warnings.push('No textures found to compress.');
        } else {
            let resizeOption: GltfOptimizationTextureOptions['resize'];
            if (Array.isArray(textures.resize)) {
                if (
                    textures.resize.length === 2 &&
                    textures.resize.every((value) => typeof value === 'number' && Number.isFinite(value))
                ) {
                    resizeOption = [textures.resize[0], textures.resize[1]];
                } else {
                    warnings.push('Texture resize must be a [width, height] array.');
                }
            } else if (typeof textures.resize === 'string') {
                resizeOption = textures.resize;
            }

            let encoder: unknown | undefined;
            if (textures.useSharp) {
                encoder = await loadSharpEncoder(warnings) ?? undefined;
            }

            transforms.push(
                textureCompress({
                    encoder,
                    targetFormat: textures.format,
                    resize: resizeOption,
                    quality: textures.quality,
                })
            );
            actions.push('textureCompress');
        }
    }

    if (transforms.length > 0) {
        await document.transform(...transforms);
    }

    const outputBytes = await writeGltfDocument(document, outputPath);
    const bytesSaved = Math.max(0, bytes - outputBytes);
    const percentSaved = bytes > 0 ? Math.round((bytesSaved / bytes) * 10000) / 100 : 0;

    const { analysis } = await buildAnalysis(document, outputPath, outputBytes);

    return {
        source: {
            path: resolvedPath,
            bytes,
        },
        output: {
            path: outputPath,
            bytes: outputBytes,
            bytesSaved,
            percentSaved,
        },
        actions,
        warnings,
        summary: analysis.summary,
        inspection: analysis.inspection,
    };
}
