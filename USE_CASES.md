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

### Get Specific Object Position

**Prompt**: "Where is the PlayerHouse positioned?"

**Tool**: `get_object_position`

```json
// Returns exact coordinates
```

---

## 🏗️ Use Case 2: Rapid Prototyping

**Scenario**: Test object placement and scene composition without touching code.

### Spawn Test Objects

**Prompt**: "Create a red sphere at position [0, 5, 0] called 'TestMarker'"

**Tool**: `spawn_entity`

```
✅ Spawned "TestMarker" (sphere) at [0, 5, 0]
```

### Move Objects in Real-Time

**Prompt**: "Move 'TestMarker' to [2, 3, -5]"

**Tool**: `move_object`

```
✅ Moved "TestMarker" from [0, 5, 0] to [2, 3, -5]
```

### Clone for Patterns

**Prompt**: "Duplicate 'TestMarker' as 'TestMarker2' with offset [3, 0, 0]"

**Tool**: `duplicate_entity`

```
✅ Created "TestMarker2" at offset [3, 0, 0] from "TestMarker"
```

### Clean Up

**Prompt**: "Remove 'TestMarker' and 'TestMarker2'"

**Tool**: `destroy_entity`

```
✅ Destroyed "TestMarker"
✅ Destroyed "TestMarker2"
```

---

## 🎥 Use Case 3: Camera Choreography

**Scenario**: Find perfect camera angles for screenshots, trailers, or cutscenes.

### Get Current Camera State

**Prompt**: "What's the current camera position?"

**Tool**: `get_camera_state`

```json
{
  "position": [x, y, z],
  "rotation": [rx, ry, rz],
  "lookAt": [lx, ly, lz],
  "fov": 60
}
```

### Set Up Cinematic View

**Prompt**: "Move the camera to [10, 8, 10] looking at [0, 0, 0]"

**Tool**: `set_camera_position`

```
✅ Teleported camera to [10, 8, 10] looking at [0, 0, 0]
```

---

## 🎨 Use Case 4: Vibe Check

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

### Add Atmospheric Lighting

**Prompt**: "Add a blue point light at [0, 5, 0] with intensity 2"

**Tool**: `add_light`

```
✅ Added point light at [0, 5, 0]
```

---

## ⚡ Use Case 5: Physics Playground

**Scenario**: Test physics interactions without code changes.

### Add Physics to Objects

**Prompt**: "Make 'TestCube' a dynamic physics object"

**Tool**: `make_physical`

```
✅ Added dynamic physics body to "TestCube"
```

Body types: `dynamic`, `kinematic`, `static`
Collider types: `cuboid`, `ball`, `hull`, `trimesh`, `auto`

### Apply Force

**Prompt**: "Push 'TestCube' upward with impulse [0, 10, 0]"

**Tool**: `apply_impulse`

```
✅ Applied impulse [0, 10, 0] to "TestCube"
```

### Change Gravity

**Prompt**: "Set gravity to moon-like at [0, -1.6, 0]"

**Tool**: `set_gravity`

```
✅ Set gravity to [0, -1.6, 0]
```

---

## 📋 Quick Reference

| Category | Tools |
|----------|-------|
| **Inspect** | `get_scene_state`, `find_objects`, `get_object_position`, `log_positions` |
| **Create** | `spawn_entity`, `duplicate_entity`, `load_asset` |
| **Transform** | `move_object`, `set_transform`, `set_visibility` |
| **Camera** | `get_camera_state`, `set_camera_position`, `look_at` |
| **Visual** | `apply_vibe`, `set_environment`, `add_light`, `apply_material` |
| **Physics** | `make_physical`, `apply_impulse`, `set_gravity` |

---

## 🚀 Getting Started

1. Install threlte-mcp in your AI tool
2. Add MCPBridge to your Threlte app
3. Start your dev server
4. Ask your AI to "get the scene state" to verify connection

See [README.md](./README.md) for full installation instructions.
