# Threlte MCP - Real-World Use Cases

This document demonstrates threlte-mcp capabilities using **Paper Pet Island** as the example application. These are real interactions captured from an AI agent working with the 3D scene.

---

## 🔍 Use Case 1: Scene Debugging

**Scenario**: You need to quickly understand your 3D scene structure, find specific objects, or debug positioning issues.

### Get Full Scene Hierarchy

**Prompt**: "Get the current scene state"

**Tool**: `get_scene_state`

```json
// Response shows the complete scene hierarchy with positions
{
  "data": [
    // Scene objects will be listed here with:
    // - name, path, type
    // - position [x, y, z]
    // - rotation, scale
    // - child count
  ]
}
```

### Find Objects by Name

**Prompt**: "Find all objects with 'Player' in the name"

**Tool**: `find_objects`

```json
// Results will show matching objects
```

### Log Positions for Code

**Prompt**: "Give me the position of all landmarks so I can copy them into the config file"

**Tool**: `log_positions`

```
landmark_windmill: [12, 0, -5]
landmark_fountain: [0, 0, 0]
...
```

---

## 🏗️ Use Case 2: Asset Pipeline & Health

**Scenario**: Analyze and validate 3D models before adding them to the game to prevent performance issues.

### Analyze GLB Stats

**Prompt**: "Check if 'house_v2.glb' is optimized enough for mobile"

**Tool**: `analyze_gltf`

```json
{
  "summary": {
    "drawCalls": 18,
    "estimatedTriangles": 12500,
    "materials": 4,
    "textures": 2
  }
}
```

### Optimize Assets

**Prompt**: "Optimize 'huge_fountain.glb' to reduce file size"

**Tool**: `optimize_gltf`

```
✅ Optimized "huge_fountain.glb" -> "huge_fountain_opt.glb"
   - Saved: 1.2MB (45%)
   - Actions: dedup, quantize, textureCompress
```

### Generate Svelte Components

**Prompt**: "Create a Threlte component for the optimized fountain"

**Tool**: `export_to_svelte`

```
✅ Generated "Fountain.svelte"
```

---

## 🎥 Use Case 3: Cinematic Camera Control

**Scenario**: Find perfect camera angles and create cinematic sequences for trailers or tutorials.

### Save Perfect Angles

**Prompt**: "Save this view as 'overview'"

**Tool**: `save_camera_preset`

```
✅ Saved camera preset "overview"
```

### Switch Views Instantly

**Prompt**: "Show me the 'closeup' view"

**Tool**: `load_camera_preset`

```
✅ Loaded camera preset "closeup"
```

### Create Animated Sequence

**Prompt**: "Fly the camera from 'start' to 'overview' to 'closeup' over 5 seconds"

**Tool**: `animate_camera_presets`

```
✅ Animated camera through 3 preset(s)
```

---

## 🎨 Use Case 4: Vibe Check & Environment

**Scenario**: Quickly test different visual moods and atmospheres.

### Apply Mood Preset

**Prompt**: "Apply the 'neon' vibe to the scene"

**Tool**: `apply_vibe`

```
✅ Applied "neon" vibe preset
```

Available vibes: `cozy`, `spooky`, `neon`, `retro`, `minimal`, `chaos`

### Change Environment

**Prompt**: "Set the environment to sunset with visible background"

**Tool**: `set_environment`

```
✅ Set environment to "sunset"
```

Available environments: `sunset`, `dawn`, `night`, `warehouse`, `forest`, `apartment`, `studio`, `city`, `park`, `lobby`

---

## ⚡ Use Case 5: Physics Playground

**Scenario**: Test physics interactions without code changes.

### Add Physics to Objects

**Prompt**: "Make 'TestCube' a dynamic physics object"

**Tool**: `make_physical`

```
✅ Added dynamic physics body to "TestCube"
```

### Apply Force

**Prompt**: "Push 'TestCube' upward with impulse [0, 10, 0]"

**Tool**: `apply_impulse`

```
✅ Applied impulse [0, 10, 0] to "TestCube"
```

---

## 📋 Quick Reference

| Category | Tools |
|----------|-------|
| **Inspect** | `get_scene_state`, `find_objects`, `log_positions`, `get_bridge_status` |
| **Assets** | `analyze_gltf`, `optimize_gltf`, `export_to_svelte`, `load_asset` |
| **Camera** | `set_camera_position`, `save_camera_preset`, `load_camera_preset`, `animate_camera_presets` |
| **Manipulate** | `spawn_entity`, `move_object`, `set_transform`, `visibility` |
| **Visual** | `apply_vibe`, `set_environment`, `apply_material` |
| **Physics** | `make_physical`, `apply_impulse`, `set_gravity` |
