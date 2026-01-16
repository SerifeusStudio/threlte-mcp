# Testing Guide: Threlte MCP v1.3.0 with Paper Pet Island

## Setup Complete ✓

Your Antigravity IDE is now configured to use threlte-mcp v1.3.0 with all Phase 2 features.

### Configuration Updated
- **Antigravity Config:** `C:\Users\Raul\.gemini\antigravity\mcp_config.json`
- **MCP Server:** `threlte` (points to C:/Users/Raul/Documents/GitHub/threlte-mcp)
- **Game Server:** Paper Pet Island dev server running on http://localhost:5174
- **WebSocket Bridge:** ws://127.0.0.1:8083 (auto-enabled in dev mode)

---

## Architecture Overview

```
Antigravity IDE
    ↓ (stdio)
threlte-mcp server (30 tools)
    ↓ (WebSocket ws://127.0.0.1:8083)
MCPBridge in Paper Pet Island game
    ↓
Threlte/Three.js scene
```

---

## How to Test Phase 2 Features

### 1. Start Testing Session in Antigravity

Open Antigravity and start a new conversation. The threlte-mcp server will automatically connect when you use MCP tools.

### 2. Test Camera Presets (v1.2.0 Feature)

**Save a camera preset:**
```
In Antigravity, type:
"Save the current camera view as 'test-view-1'"
```

**Expected behavior:**
- MCP server sends `getCameraState` command to game
- Game returns current camera position, rotation, FOV
- MCP server saves preset
- Responds: "OK. Saved camera preset 'test-view-1'"

**Load a camera preset:**
```
"Load camera preset 'overhead'"
```

**Expected behavior:**
- Camera animates to overhead position [0, 50, 0]
- Looking at origin [0, 0, 0]

**List all presets:**
```
"List all available camera presets"
```

**Expected behavior:**
- Shows default presets: overhead, front, side, perspective, closeup, wideangle
- Shows any custom presets you've saved
- Displays position, lookAt, FOV for each

---

### 3. Test Camera Animation (v1.3.0 NEW Feature)

**Create a camera flythrough:**
```
"Animate the camera through these presets: overhead, front, side, closeup
with 2 second transitions and 1 second holds, repeat 2 times"
```

**Expected behavior:**
- Camera smoothly animates: overhead → front → side → closeup
- Holds at each position for 1 second
- Transitions take 2 seconds each
- Repeats the sequence twice
- Total duration: (4 presets × 3 seconds) × 2 = 24 seconds

**Parameters you can test:**
- `duration`: Time to transition between presets (default 1000ms)
- `hold`: Time to hold at each preset (default 0ms)
- `repeat`: Number of times to repeat sequence (default 1)

---

### 4. Test GLTF Optimization (v1.3.0 NEW Feature)

**Prerequisites:** Have a GLTF/GLB model in your game

**Optimize a model:**
```
"Optimize the spaceship.glb file with these settings:
- Reduce polygons by 50%
- Compress textures to WebP at 1024x1024
- Enable deduplication and welding"
```

**MCP Tool Call:**
```json
{
  "name": "optimize_gltf",
  "arguments": {
    "path": "/path/to/spaceship.glb",
    "output": "/path/to/spaceship-optimized.glb",
    "options": {
      "dedup": true,
      "prune": true,
      "weld": true,
      "quantize": true,
      "simplify": {
        "ratio": 0.5,
        "error": 0.01,
        "lockBorder": true
      },
      "textures": {
        "format": "webp",
        "resize": [1024, 1024],
        "quality": 85
      }
    }
  }
}
```

**Expected results:**
- File size reduction: 60-80% typical
- Mesh simplification: 50% fewer vertices
- Texture compression: WebP format at 1024x1024
- Output report with before/after stats

---

### 5. Test Svelte Component Generation (v1.3.0 NEW Feature)

**Generate a Threlte component:**
```
"Generate a Threlte component from the character.glb model
in primitive mode, name it Character.svelte"
```

**Expected output:**
A new `Character.svelte` file with:

```svelte
<script lang="ts">
  import { GLTF } from '@threlte/extras';

  interface Props {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
  }

  let {
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1
  }: Props = $props();
</script>

<GLTF
  url="/assets/models/character.glb"
  {position}
  {rotation}
  {scale}
/>
```

**Test with 'nodes' mode:**
```
"Export character.glb to Svelte in nodes mode"
```

**Expected:** Full node hierarchy with TypeScript types for each mesh/material

---

## Verification Checklist

### Camera System
- [ ] Can save custom camera presets
- [ ] Can load saved presets
- [ ] Can list all presets with details
- [ ] Can delete unwanted presets
- [ ] Default presets are available
- [ ] Camera animation plays smoothly
- [ ] Animation parameters (duration, hold, repeat) work correctly

### GLTF Optimization
- [ ] Can analyze GLTF structure
- [ ] Can validate GLTF files
- [ ] Can optimize mesh geometry
- [ ] Can simplify polygons
- [ ] Can compress textures
- [ ] Output file is smaller than input
- [ ] Optimization report shows stats

### Svelte Generation
- [ ] Can generate primitive mode components
- [ ] Can generate nodes mode components
- [ ] Generated code uses Svelte 5 runes
- [ ] TypeScript types are correct
- [ ] Component is ready to use in project

### Bridge Connection
- [ ] WebSocket connects on game start (dev mode)
- [ ] MCP server can send commands to game
- [ ] Game responds to camera commands
- [ ] No connection errors in console

---

## Troubleshooting

### Issue: "Bridge not connected"

**Solution:**
1. Make sure Paper Pet Island dev server is running: http://localhost:5174
2. Check that MCPBridge auto-enables in dev mode
3. Verify WebSocket port 8083 is not blocked
4. Check browser console for WebSocket errors

### Issue: "Camera preset not found"

**Solution:**
- Use `list_camera_presets` to see available presets
- Make sure you saved the preset first
- Check preset name spelling (case-sensitive)

### Issue: "GLTF file not found"

**Solution:**
- Use absolute paths or paths relative to game root
- Check file extension (.glb vs .gltf)
- Verify file exists at specified path

### Issue: "Antigravity not detecting MCP server"

**Solution:**
1. Restart Antigravity IDE
2. Check `mcp_config.json` syntax is valid JSON
3. Verify tsx path is correct
4. Run `npm install` in threlte-mcp directory

---

## Testing Script (Copy-Paste Ready)

```
# 1. Test basic camera controls
"Set camera position to [0, 10, 10] looking at [0, 0, 0]"
"Save current view as 'my-test-view'"
"List all camera presets"

# 2. Test camera animation
"Animate camera through: overhead, front, side with 2s transitions, repeat 2 times"

# 3. Test GLTF tools
"Analyze the structure of [your-model.glb]"
"Validate [your-model.glb] for issues"
"Optimize [your-model.glb], reduce polygons by 70%, compress to WebP"

# 4. Test component generation
"Generate a Threlte component from [your-model.glb] in primitive mode"

# 5. Verify bridge
"Check the MCP bridge connection status"
"Get current scene state"
```

---

## Next Steps After Testing

1. **Document any bugs** you find in GitHub issues
2. **Collect performance metrics** (optimization results, animation smoothness)
3. **Test with different GLTF models** (simple vs complex)
4. **Verify generated components** work in your Svelte project
5. **Publish v1.3.0 to npm** once testing is complete

---

## Quick Reference: All 30 Tools

### Scene Inspection (4)
- `get_scene_state` - Full scene hierarchy
- `find_objects` - Search by name/type
- `get_object_position` - Get position
- `log_positions` - Export as code

### Camera (6)
- `set_camera_position` - Position camera
- `save_camera_preset` - Save view
- `load_camera_preset` - Load view
- `list_camera_presets` - List presets
- `delete_camera_preset` - Delete preset
- `animate_camera_presets` - **NEW** - Flythrough

### Asset Processing (3)
- `analyze_gltf` - Deep analysis
- `validate_asset` - Health check
- `optimize_gltf` - **NEW** - Optimization

### Svelte Generation (1)
- `export_to_svelte` - **NEW** - Generate components

### Hierarchy (7)
- `spawn_entity` - Create objects
- `destroy_entity` - Remove
- `move_object` - Move
- `set_transform` - Transform
- `set_visibility` - Show/hide
- `rename_entity` - Rename
- `duplicate_entity` - Clone

### Physics (4)
- `make_physical` - Add physics
- `remove_physics` - Remove
- `apply_impulse` - Apply force
- `set_gravity` - Set gravity

### Materials (4)
- `load_asset` - Load GLTF
- `apply_material` - Apply material
- `set_environment` - Set environment
- `apply_vibe` - Mood presets

### Utilities (1)
- `get_bridge_status` - Bridge status

---

**Version:** v1.3.0 (Phase 2 Complete)
**Test Date:** 2026-01-14
**Total Tools:** 30
