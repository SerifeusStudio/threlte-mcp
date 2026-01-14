#!/usr/bin/env node
/**
 * Threlte MCP Server
 *
 * An MCP server that exposes Three.js/Threlte scenes to AI agents
 * for inspection, debugging, and manipulation.
 *
 * Usage:
 *   npx threlte-mcp
 *
 * Prerequisites:
 *   1. Game must be running with MCPBridge component
 *   2. MCPBridge connects to ws://localhost:8082
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { BridgeServer } from './bridge-server.js';
import { analyzeGltf, validateGltf } from './gltf-tools.js';

// Tool definitions
const TOOLS: Tool[] = [
    // Scene Inspection
    {
        name: 'get_scene_state',
        description: 'Get the full scene hierarchy with all named objects, positions, and transforms',
        inputSchema: {
            type: 'object',
            properties: {
                maxDepth: { type: 'number', description: 'Maximum depth to traverse (default: 3)' }
            }
        }
    },
    {
        name: 'find_objects',
        description: 'Search for objects by name, type, or userData properties',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Exact object name to find' },
                nameContains: { type: 'string', description: 'Partial name match' },
                type: { type: 'string', description: 'Object type (Mesh, Group, etc.)' },
                hasUserData: { type: 'string', description: 'UserData property key that must exist' }
            }
        }
    },
    {
        name: 'get_object_position',
        description: 'Get the position of a specific object by name',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Object name' }
            },
            required: ['name']
        }
    },
    {
        name: 'log_positions',
        description: 'Log all object positions in copy-paste format for code',
        inputSchema: {
            type: 'object',
            properties: {
                filter: { type: 'string', description: 'Optional name filter' }
            }
        }
    },

    // Camera Control
    {
        name: 'set_camera_position',
        description: 'Set camera position with optional lookAt target and lens settings',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Optional camera object name' },
                position: { type: 'array', items: { type: 'number' }, description: '[x, y, z] position' },
                lookAt: { type: 'array', items: { type: 'number' }, description: '[x, y, z] look target' },
                fov: { type: 'number', description: 'Field of view in degrees (PerspectiveCamera)' },
                near: { type: 'number', description: 'Near clipping plane' },
                far: { type: 'number', description: 'Far clipping plane' }
            },
            required: ['position']
        }
    },

    // Hierarchy Management
    {
        name: 'spawn_entity',
        description: 'Spawn a new primitive entity (box, sphere, plane, etc.)',
        inputSchema: {
            type: 'object',
            properties: {
                type: { type: 'string', description: 'Primitive type: box, sphere, plane, cylinder, cone, torus' },
                name: { type: 'string', description: 'Name for the new entity' },
                position: { type: 'array', items: { type: 'number' }, description: '[x, y, z] position' },
                color: { type: 'string', description: 'Hex color (e.g., #ff0000)' },
                parentName: { type: 'string', description: 'Optional parent object name' }
            },
            required: ['type', 'name']
        }
    },
    {
        name: 'destroy_entity',
        description: 'Remove an entity from the scene',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Entity name to destroy' }
            },
            required: ['name']
        }
    },
    {
        name: 'move_object',
        description: 'Move an object to a new position',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Object name or path' },
                position: { type: 'array', items: { type: 'number' }, description: '[x, y, z] position' }
            },
            required: ['name', 'position']
        }
    },
    {
        name: 'set_transform',
        description: 'Set position, rotation, and/or scale of an object',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Object name' },
                position: { type: 'array', items: { type: 'number' }, description: '[x, y, z]' },
                rotation: { type: 'array', items: { type: 'number' }, description: '[x, y, z] in radians' },
                scale: { type: 'array', items: { type: 'number' }, description: '[x, y, z]' }
            },
            required: ['name']
        }
    },
    {
        name: 'set_visibility',
        description: 'Show or hide an object',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Object name' },
                visible: { type: 'boolean', description: 'Visibility state' }
            },
            required: ['name', 'visible']
        }
    },
    {
        name: 'rename_entity',
        description: 'Rename an object in the scene',
        inputSchema: {
            type: 'object',
            properties: {
                oldName: { type: 'string', description: 'Current name' },
                newName: { type: 'string', description: 'New name' }
            },
            required: ['oldName', 'newName']
        }
    },
    {
        name: 'duplicate_entity',
        description: 'Clone an object with optional position offset',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Object to clone' },
                newName: { type: 'string', description: 'Name for the clone' },
                offset: { type: 'array', items: { type: 'number' }, description: '[x, y, z] offset from original' }
            },
            required: ['name', 'newName']
        }
    },

    // Physics
    {
        name: 'make_physical',
        description: 'Add physics body to an object',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Object name' },
                type: { type: 'string', description: 'Body type: dynamic, kinematic, static' },
                colliders: { type: 'string', description: 'Collider type: cuboid, ball, hull, trimesh, auto' }
            },
            required: ['name']
        }
    },
    {
        name: 'remove_physics',
        description: 'Remove physics body from an object',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Object name' }
            },
            required: ['name']
        }
    },
    {
        name: 'apply_impulse',
        description: 'Apply an impulse force to a physics object',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Object name' },
                vector: { type: 'array', items: { type: 'number' }, description: '[x, y, z] impulse' }
            },
            required: ['name', 'vector']
        }
    },
    {
        name: 'set_gravity',
        description: 'Set global gravity vector',
        inputSchema: {
            type: 'object',
            properties: {
                vector: { type: 'array', items: { type: 'number' }, description: '[x, y, z] gravity' }
            },
            required: ['vector']
        }
    },

    // Materials & Assets
    {
        name: 'analyze_gltf',
        description: 'Analyze a GLTF/GLB file for meshes, materials, textures, and animations',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Local path or file:// URL to a .gltf/.glb file' }
            },
            required: ['path']
        }
    },
    {
        name: 'validate_asset',
        description: 'Validate a GLTF/GLB file for structural and performance issues',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Local path or file:// URL to a .gltf/.glb file' },
                limits: {
                    type: 'object',
                    properties: {
                        maxDrawCalls: { type: 'number', description: 'Max draw calls before warning' },
                        maxTriangles: { type: 'number', description: 'Max triangles before warning' },
                        maxVertices: { type: 'number', description: 'Max vertices before warning' },
                        maxTextures: { type: 'number', description: 'Max textures before warning' },
                        maxMaterials: { type: 'number', description: 'Max materials before warning' },
                        maxAnimations: { type: 'number', description: 'Max animations before warning' }
                    }
                }
            },
            required: ['path']
        }
    },
    {
        name: 'load_asset',
        description: 'Load a GLTF/GLB model into the scene',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL or path to the asset' },
                name: { type: 'string', description: 'Name for the loaded model' },
                position: { type: 'array', items: { type: 'number' }, description: '[x, y, z]' },
                scale: { type: 'array', items: { type: 'number' }, description: '[x, y, z]' }
            },
            required: ['url', 'name']
        }
    },
    {
        name: 'apply_material',
        description: 'Apply a material to an object',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Object name' },
                type: { type: 'string', description: 'Material type: Standard, Physical, Basic, Toon' },
                color: { type: 'string', description: 'Hex color' },
                preset: { type: 'string', description: 'Material preset: cyberpunk, gold, glass, cartoon' }
            },
            required: ['name']
        }
    },
    {
        name: 'set_environment',
        description: 'Set the scene environment/skybox',
        inputSchema: {
            type: 'object',
            properties: {
                preset: { type: 'string', description: 'Environment preset: sunset, dawn, night, warehouse, forest, apartment, studio, city, park, lobby' },
                blur: { type: 'number', description: 'Background blur amount' },
                background: { type: 'boolean', description: 'Show environment as background' }
            },
            required: ['preset']
        }
    },

    // Vibe & Atmosphere
    {
        name: 'apply_vibe',
        description: 'Apply a visual vibe/mood preset to the scene',
        inputSchema: {
            type: 'object',
            properties: {
                vibe: { type: 'string', description: 'Vibe name: cozy, spooky, neon, retro, minimal, chaos' }
            },
            required: ['vibe']
        }
    },

    // Bridge Status
    {
        name: 'get_bridge_status',
        description: 'Get the connection status of the bridge server',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    }
];

const LOCAL_ONLY_TOOLS = new Set(['get_bridge_status', 'analyze_gltf', 'validate_asset']);

// Create MCP server
const server = new Server(
    {
        name: 'threlte-mcp',
        version: '1.1.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Bridge server for WebSocket communication
const bridge = new BridgeServer();

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!bridge.isConnected() && !LOCAL_ONLY_TOOLS.has(name)) {
        try {
            await bridge.connect();
        } catch {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to connect to game. Make sure:\n1. Game is running (npm run dev)\n2. MCP bridge is enabled (localStorage.setItem("MCP_ENABLED", "true") in browser console)\n3. Refresh the page after enabling`,
                    },
                ],
                isError: true,
            };
        }
    }

    try {
        switch (name) {
            case 'get_scene_state': {
                const maxDepth = (args as { maxDepth?: number })?.maxDepth ?? 3;
                const result = await bridge.sendCommand({ action: 'getFullSceneState', maxDepth });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'find_objects': {
                const { name: objName, nameContains, type, hasUserData } = args as {
                    name?: string; nameContains?: string; type?: string; hasUserData?: string;
                };
                const result = await bridge.sendCommand({
                    action: 'findObjects',
                    name: objName,
                    filter: { nameContains, type, hasUserData },
                });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'get_object_position': {
                const { name: objName } = args as { name: string };
                const result = await bridge.sendCommand({ action: 'findObjects', name: objName });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'set_camera_position': {
                const { name: cameraName, position, lookAt, fov, near, far } = args as {
                    name?: string;
                    position: [number, number, number];
                    lookAt?: [number, number, number];
                    fov?: number;
                    near?: number;
                    far?: number;
                };
                await bridge.sendCommand({
                    action: 'setCameraPosition',
                    name: cameraName,
                    position,
                    lookAt,
                    fov,
                    near,
                    far,
                });
                const target = cameraName ? `camera "${cameraName}"` : 'camera';
                return {
                    content: [{
                        type: 'text',
                        text: `OK. Set ${target} position to [${position.join(', ')}]`
                    }]
                };
            }

            case 'move_object': {
                const { name: objName, position } = args as { name: string; position: [number, number, number] };
                const result = await bridge.sendCommand({ action: 'moveSceneObject', path: objName, position });
                return {
                    content: [{
                        type: 'text',
                        text: result ? `✅ Moved "${objName}" to [${position.join(', ')}]` : `❌ Object "${objName}" not found`
                    }]
                };
            }

            case 'spawn_entity': {
                const { type, name: entityName, position, color, parentName } = args as {
                    type: string; name: string; position?: [number, number, number]; color?: string; parentName?: string;
                };
                await bridge.sendCommand({
                    action: 'addPrimitive',
                    type: type.toLowerCase(),
                    name: entityName,
                    position: position || [0, 0, 0],
                    material: color ? { color } : undefined,
                    parent: parentName,
                });
                return {
                    content: [{
                        type: 'text',
                        text: `✅ Spawned "${entityName}" (${type}) at [${(position || [0, 0, 0]).join(', ')}]`
                    }]
                };
            }

            case 'destroy_entity': {
                const { name: entityName } = args as { name: string };
                const result = await bridge.sendCommand({ action: 'removeObject', id: entityName, name: entityName });
                return {
                    content: [{
                        type: 'text',
                        text: result ? `✅ Destroyed "${entityName}"` : `❌ Object "${entityName}" not found`
                    }]
                };
            }

            case 'set_transform': {
                const { name: objName, position, rotation, scale } = args as {
                    name: string; position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number];
                };
                const updates: string[] = [];
                if (position) {
                    await bridge.sendCommand({ action: 'moveSceneObject', path: objName, position });
                    updates.push(`position: [${position.join(', ')}]`);
                }
                if (rotation) {
                    await bridge.sendCommand({ action: 'setRotation', id: objName, name: objName, rotation });
                    updates.push(`rotation: [${rotation.join(', ')}]`);
                }
                if (scale) {
                    await bridge.sendCommand({ action: 'setScale', id: objName, name: objName, scale });
                    updates.push(`scale: [${scale.join(', ')}]`);
                }
                return {
                    content: [{
                        type: 'text',
                        text: updates.length > 0 ? `✅ Updated "${objName}": ${updates.join(', ')}` : `⚠️ No transform properties specified`
                    }]
                };
            }

            case 'set_visibility': {
                const { name: objName, visible } = args as { name: string; visible: boolean };
                await bridge.sendCommand({ action: 'setVisibility', name: objName, visible });
                return { content: [{ type: 'text', text: `✅ ${visible ? 'Showed' : 'Hid'} "${objName}"` }] };
            }

            case 'apply_vibe': {
                const { vibe } = args as { vibe: string };
                await bridge.sendCommand({ action: 'applyVibe', vibe });
                return { content: [{ type: 'text', text: `✅ Applied vibe "${vibe}"` }] };
            }

            case 'set_environment': {
                const { preset } = args as { preset: string };
                await bridge.sendCommand({ action: 'setEnvironment', preset });
                return { content: [{ type: 'text', text: `✅ Set environment to "${preset}"` }] };
            }

            case 'apply_impulse': {
                const { name: objName, vector } = args as { name: string; vector: [number, number, number] };
                await bridge.sendCommand({ action: 'applyImpulse', name: objName, vector });
                return { content: [{ type: 'text', text: `✅ Applied impulse [${vector.join(', ')}] to "${objName}"` }] };
            }

            case 'set_gravity': {
                const { vector } = args as { vector: [number, number, number] };
                await bridge.sendCommand({ action: 'setGravity', vector });
                return { content: [{ type: 'text', text: `✅ Set global gravity to [${vector.join(', ')}]` }] };
            }

            case 'analyze_gltf': {
                const { path } = args as { path: string };
                const result = await analyzeGltf(path);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'validate_asset': {
                const { path, limits } = args as { path: string; limits?: Record<string, number> };
                const result = await validateGltf(path, limits);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'load_asset': {
                const { url, name: objName, position, scale } = args as {
                    url: string; name: string; position?: [number, number, number]; scale?: [number, number, number];
                };
                await bridge.sendCommand({ action: 'loadAsset', url, name: objName, position, scale });
                return { content: [{ type: 'text', text: `✅ Loaded asset "${objName}" from ${url}` }] };
            }

            case 'apply_material': {
                const { name: objName, type, color, preset } = args as {
                    name: string; type?: string; color?: string; preset?: string;
                };
                await bridge.sendCommand({ action: 'applyMaterial', name: objName, type: type || 'Standard', color, preset });
                return { content: [{ type: 'text', text: `✅ Applied material to "${objName}"` }] };
            }

            case 'get_bridge_status': {
                return { content: [{ type: 'text', text: JSON.stringify(bridge.getStatus(), null, 2) }] };
            }

            default:
                return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
        }
    } catch (error) {
        return {
            content: [{ type: 'text', text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
        };
    }
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('🎮 Threlte MCP Server ready');
    console.error('   Waiting for game client on ws://localhost:8082');
}

main().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
});
