/**
 * threlte-mcp Client Package
 * 
 * Client-side bridge for connecting Threlte/Three.js apps to the MCP server.
 * 
 * @example
 * ```typescript
 * // Option 1: Import the class directly
 * import { MCPBridge } from 'threlte-mcp/client';
 * const bridge = new MCPBridge(scene);
 * 
 * // Option 2: Use the Svelte component
 * import MCPBridgeComponent from 'threlte-mcp/client/MCPBridge.svelte';
 * ```
 */

export { MCPBridge, getMCPBridge, type MCPBridgeOptions } from './MCPBridge.js';
export { default as MCPBridgeComponent } from './MCPBridge.svelte';
