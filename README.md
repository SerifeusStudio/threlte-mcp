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
- ⚡ **Physics Control** - Add physics bodies, apply impulses, set gravity
- 🎭 **Vibe Presets** - Apply mood presets (cozy, spooky, neon, etc.)

## Installation

```bash
npm install threlte-mcp
```

## Quick Start

### 1. Add the MCP server to your AI tool configuration

```json
{
  "mcpServers": {
    "threlte": {
      "command": "npx",
      "args": ["threlte-mcp"]
    }
  }
}
```

### 2. Add MCPBridge to your Threlte app

Create a component in your Svelte/Threlte project:

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

The server uses port 8082 by default for WebSocket communication.

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
