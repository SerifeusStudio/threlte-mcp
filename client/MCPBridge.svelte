<!--
  MCPBridge Svelte Component
  
  Drop-in component that initializes the MCP bridge for your Threlte app.
  Auto-connects in development mode.
  
  @example
  ```svelte
  <script>
    import { MCPBridge } from 'threlte-mcp/client';
  </script>
  
  <MCPBridge />
  ```
-->
<script lang="ts">
    import { useThrelte } from "@threlte/core";
    import { onMount, onDestroy } from "svelte";
    import {
        MCPBridge as Bridge,
        getMCPBridge,
        type MCPBridgeOptions,
    } from "./MCPBridge.js";

    interface Props {
        /** Custom WebSocket URL (default: ws://127.0.0.1:8082) */
        url?: string;
        /** Force enable/disable (default: auto in dev mode) */
        enabled?: boolean;
        /** Reconnect delay in ms (default: 60000) */
        reconnectDelay?: number;
    }

    let { url, enabled, reconnectDelay }: Props = $props();

    const { scene } = useThrelte();
    let bridge: Bridge | null = null;

    onMount(() => {
        if (scene) {
            const options: MCPBridgeOptions = {
                url,
                reconnectDelay,
                autoConnect: enabled,
            };

            bridge = getMCPBridge(scene) || new Bridge(scene, options);
            console.log('[MCPBridge] Component initialized');
        }
    });

    onDestroy(() => {
        bridge?.disconnect();
        console.log('[MCPBridge] Component destroyed');
    });
</script>

<!-- No visible UI - this is a logic-only component -->

