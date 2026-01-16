# Threlte MCP

[![npm version](https://img.shields.io/npm/v/threlte-mcp.svg)](https://www.npmjs.com/package/threlte-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

An MCP (Model Context Protocol) server that enables AI agents to inspect and manipulate Three.js/Threlte scenes in real-time.

## ✅ Compatible With

- **Claude Desktop** - Anthropic's desktop app
- **Antigravity** - Google's AI IDE
- **Claude Code** - CLI tool for Claude
- **Cursor** - AI-powered code editor
- **Windsurf** - Codeium's AI IDE
- **Continue** - VS Code AI extension
- **Any MCP-compatible client**

[See detailed compatibility guide →](./COMPATIBILITY.md)

## Features

- 🔍 **Scene Inspection** - View the full 3D scene hierarchy, find objects by name/type
- 🎯 **Object Manipulation** - Move, rotate, scale, show/hide objects
- 🎨 **Materials & Assets** - Apply materials, load GLTF models, change environment
- 🧪 **Asset Analysis** - Inspect GLTF structure and validate performance
- dYZ+ **Asset Optimization** - Simplify meshes, compress textures, prune unused data
- dY"? **Svelte Export** - Generate Threlte/Svelte components from GLTF
- dYZ? **Camera Presets** - Save, load, and animate camera views
- ⚡ **Physics Control** - Add physics bodies, apply impulses, set gravity
- 🎭 **Vibe Presets** - Apply mood presets (cozy, spooky, neon, etc.)

## Installation

```bash
npm install threlte-mcp
```

## Quick Start

### 1. Install the package

```bash
npm install threlte-mcp
```

### 2. Configure your IDE (one-time setup)

```bash
npx threlte-mcp setup
```

This auto-detects your IDE (Antigravity, Cursor, Claude Desktop) and creates the MCP config.

### 3. Add the component to your Threlte app

Requires Svelte 5 for the MCPBridge component.

```svelte
<script>
  import { MCPBridgeComponent } from 'threlte-mcp/client';
</script>

<!-- Add inside your <Canvas> -->
<MCPBridgeComponent />
```

**That's it!** The AI can now inspect and manipulate your scene.

---

<details>
<summary>📋 Manual Configuration (Alternative)</summary>

If `npx threlte-mcp setup` doesn't work for your IDE, manually add to your config:

```json
{
  "mcpServers": {
    "threlte-mcp": {
      "command": "npx",
      "args": ["-y", "threlte-mcp"]
    }
  }
}
```

Config file locations:
- **Antigravity**: `~/.gemini/antigravity/mcp_config.json`
- **Cursor**: `~/.cursor/mcp.json`
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac)

</details>

<details>
<summary>🔧 Advanced: TypeScript API</summary>

```typescript
import { MCPBridge } from 'threlte-mcp/client';
import { useThrelte } from '@threlte/core';

const { scene } = useThrelte();

// Create bridge (auto-connects in dev mode)
const bridge = new MCPBridge(scene, {
  url: 'ws://127.0.0.1:8082',  // default
  autoConnect: true,           // default in dev
  reconnectDelay: 60000,       // 1 minute
});

// In render loop
bridge.update();

// Get scene state
bridge.getSceneState();

// Find objects
bridge.findObjects({ nameContains: 'player' });
```

</details>


**Option B: Per-Scene (Simple for prototyping)**

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { useThrelte } from '@threlte/core';

  const { scene } = useThrelte();
  let ws: WebSocket | null = null;
  
  onMount(() => {
    ws = new WebSocket('ws://localhost:8082');
    
    ws.onopen = () => {
      console.log('[MCPBridge] Connected');
      // Send initial scene state
      ws?.send(JSON.stringify({
        type: 'sceneState',
        data: serializeScene(scene)
      }));
    };
    
    ws.onmessage = (event) => {
      const command = JSON.parse(event.data);
      handleCommand(command);
    };
  });
  
  onDestroy(() => {
    ws?.close();
  });
  
  function serializeScene(obj: THREE.Object3D, depth = 0, maxDepth = 3) {
    if (depth > maxDepth) return null;
    return {
      name: obj.name,
      type: obj.type,
      position: obj.position.toArray(),
      rotation: obj.rotation.toArray().slice(0, 3),
      scale: obj.scale.toArray(),
      visible: obj.visible,
      children: obj.children.map(c => serializeScene(c, depth + 1, maxDepth)).filter(Boolean)
    };
  }
  
  function handleCommand(cmd: any) {
    const { action, requestId, ...params } = cmd;
    let result;
    
    switch (action) {
      case 'getFullSceneState':
        result = { data: serializeScene(scene, 0, params.maxDepth || 3) };
        break;
      case 'moveSceneObject':
        const obj = scene.getObjectByName(params.name || params.path);
        if (obj && params.position) {
          obj.position.set(...params.position);
          result = { success: true };
        }
        break;
      // Add more handlers as needed
    }
    
    if (requestId) {
      ws?.send(JSON.stringify({ ...result, requestId }));
    }
  }
</script>
```

### 3. Run your app and start using MCP tools

Once both the MCP server and your Threlte app are running, AI agents can:

```
"Get the scene state"
"Find all objects named 'Player'"  
"Move the 'Camera' to position [0, 5, 10]"
"Apply the 'neon' vibe to the scene"
```

## Available Tools

### Scene Inspection
| Tool | Description |
|------|-------------|
| `get_scene_state` | Get full scene hierarchy |
| `find_objects` | Search by name, type, or userData |
| `get_object_position` | Get position of specific object |
| `log_positions` | Export positions for code |

### Camera
| Tool | Description |
|------|-------------|
| `set_camera_position` | Set camera position, lookAt, and lens settings |
| `save_camera_preset` | Save current camera view as a preset |
| `load_camera_preset` | Load a saved camera view |
| `list_camera_presets` | List all saved camera presets |
| `delete_camera_preset` | Delete a saved camera preset |
| `animate_camera_presets` | Animate through a sequence of presets |

### Hierarchy Management
| Tool | Description |
|------|-------------|
| `spawn_entity` | Create primitive (box, sphere, etc.) |
| `destroy_entity` | Remove object from scene |
| `move_object` | Set object position |
| `set_transform` | Set position, rotation, scale |
| `set_visibility` | Show/hide object |
| `rename_entity` | Rename object |
| `duplicate_entity` | Clone object |

### Physics
| Tool | Description |
|------|-------------|
| `make_physical` | Add physics body |
| `remove_physics` | Remove physics body |
| `apply_impulse` | Apply force |
| `set_gravity` | Set global gravity |

### Asset Processing
| Tool | Description |
|------|-------------|
| `analyze_gltf` | Inspect GLTF/GLB structure |
| `validate_asset` | Validate GLTF/GLB for issues |
| `optimize_gltf` | Optimize GLTF/GLB assets |
| `export_to_svelte` | Generate Threlte/Svelte component |

### Materials & Assets
| Tool | Description |
|------|-------------|
| `load_asset` | Load GLTF/GLB model |
| `apply_material` | Set material |
| `set_environment` | Set skybox/environment |

### Atmosphere
| Tool | Description |
|------|-------------|
| `apply_vibe` | Apply mood preset |
| `get_bridge_status` | Check connection status |

## Configuration

### WebSocket Connection

The server uses port 8082 by default for WebSocket communication.

### Environment Variables

The MCPBridge auto-connects in development mode. For production, you can enable it via environment variable:

```bash
# Add to .env file:
VITE_MCP_ENABLED=true
```

This is useful for:
- Testing in production builds
- Demo environments
- Debugging production issues

**Note:** Auto-enabled in development mode (`npm run dev`), no configuration needed.

## Development

```bash
# Clone the repo
git clone https://github.com/RaulContreras123/threlte-mcp.git
cd threlte-mcp

# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build
```

## License

MIT © Raul Contreras
