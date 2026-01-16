# Phase 2 Testing Checklist - threlte-mcp v1.3.0

## Pre-Test Setup ✓

- [x] Paper Pet Island dev server running (http://localhost:5174)
- [x] MCPBridge auto-enabled in dev mode (ws://127.0.0.1:8083)
- [x] Antigravity config updated to use threlte-mcp v1.3.0
- [x] All dependencies installed (tsx, @gltf-transform, meshoptimizer)
- [x] Release notes created (RELEASE_NOTES_v1.3.0.md)
- [x] Testing guide created (TESTING_v1.3.0.md)

---

## Phase 2.1: Camera Presets (v1.2.0)

### save_camera_preset
- [ ] Can save custom camera preset
- [ ] Preset includes position
- [ ] Preset includes lookAt
- [ ] Preset includes FOV
- [ ] Returns success message
- [ ] Preset persists in memory

### load_camera_preset
- [ ] Can load saved preset
- [ ] Camera moves to correct position
- [ ] Camera looks at correct target
- [ ] FOV is applied correctly
- [ ] Animation is smooth (if animate=true)
- [ ] Returns success message

### list_camera_presets
- [ ] Shows all default presets (6 presets)
  - [ ] overhead [0, 50, 0]
  - [ ] front [0, 5, 20]
  - [ ] side [20, 5, 0]
  - [ ] perspective [10, 10, 10]
  - [ ] closeup [0, 2, 5]
  - [ ] wideangle [0, 20, 30]
- [ ] Shows custom presets
- [ ] Displays position data
- [ ] Displays lookAt data
- [ ] Displays FOV data
- [ ] Shows timestamp

### delete_camera_preset
- [ ] Can delete custom preset
- [ ] Cannot delete if preset doesn't exist
- [ ] Returns success message
- [ ] Preset removed from list

---

## Phase 2.2: Camera Animation (v1.3.0 NEW)

### animate_camera_presets
- [ ] Accepts array of preset names
- [ ] Validates all presets exist before starting
- [ ] Animates through sequence in order
- [ ] Respects duration parameter (ms)
- [ ] Respects hold parameter (ms)
- [ ] Respects repeat parameter
- [ ] Smooth transitions between presets
- [ ] Returns success message with duration info

**Test Scenarios:**
- [ ] 2 presets, default settings (1s transitions, no hold, 1 repeat)
- [ ] 4 presets, 2s transitions, 1s holds, 2 repeats
- [ ] Single preset (should just move there)
- [ ] Non-existent preset (should return error)
- [ ] Empty array (should return error)

---

## Phase 2.3: GLTF Optimization (v1.3.0 NEW)

### optimize_gltf

**Basic Optimization:**
- [ ] Can read GLTF file
- [ ] Can read GLB file
- [ ] Creates output file
- [ ] Returns optimization report

**Mesh Optimization:**
- [ ] `dedup`: Removes duplicate data
- [ ] `prune`: Removes unused data
- [ ] `weld`: Merges shared vertices
- [ ] `quantize`: Compresses vertex data

**Simplification:**
- [ ] `simplify.ratio`: Reduces vertex count (0.5 = 50%)
- [ ] `simplify.error`: Respects error threshold
- [ ] `simplify.lockBorder`: Preserves mesh borders
- [ ] Returns vertex count before/after

**Texture Optimization:**
- [ ] `textures.format`: Converts to JPEG
- [ ] `textures.format`: Converts to PNG
- [ ] `textures.format`: Converts to WebP
- [ ] `textures.format`: Converts to AVIF (if Sharp installed)
- [ ] `textures.resize`: Resizes to [width, height]
- [ ] `textures.quality`: Applies quality setting
- [ ] Returns texture size before/after

**Results:**
- [ ] File size reduction achieved (60-80% typical)
- [ ] Output file is smaller than input
- [ ] Optimized model still renders correctly
- [ ] Report shows all metrics

**Test Models:**
- [ ] Simple model (< 1MB)
- [ ] Complex model with textures (> 10MB)
- [ ] Model with animations
- [ ] Model with multiple materials

---

## Phase 2.4: Svelte Component Generation (v1.3.0 NEW)

### export_to_svelte

**Primitive Mode:**
- [ ] Generates valid Svelte 5 component
- [ ] Uses `$props()` rune
- [ ] Imports `{ GLTF }` from '@threlte/extras'
- [ ] Has TypeScript Props interface
- [ ] Includes position prop
- [ ] Includes rotation prop
- [ ] Includes scale prop
- [ ] Correct asset URL
- [ ] Component name matches parameter

**Nodes Mode:**
- [ ] Generates full node hierarchy
- [ ] TypeScript types for each node
- [ ] Proper mesh/material references
- [ ] Preserves scene structure

**Output Quality:**
- [ ] Valid TypeScript syntax
- [ ] Valid Svelte 5 syntax
- [ ] No linting errors
- [ ] Component can be imported
- [ ] Component renders correctly
- [ ] Props work as expected

**Test Models:**
- [ ] Simple primitive (box, sphere)
- [ ] Complex model with hierarchy
- [ ] Model with multiple meshes
- [ ] Model with materials

---

## Bridge & Integration Tests

### MCPBridge Connection
- [ ] WebSocket connects automatically in dev mode
- [ ] Connection status shows "connected"
- [ ] Can send commands to game
- [ ] Game responds to commands
- [ ] Handles disconnection gracefully
- [ ] Reconnects on page reload

### get_bridge_status
- [ ] Returns connection status
- [ ] Shows WebSocket URL
- [ ] Shows connected state
- [ ] Returns quickly (< 100ms)

### Cross-Tool Integration
- [ ] Can save preset, then load it
- [ ] Can animate through saved presets
- [ ] Can optimize model, then generate component
- [ ] Multiple tools work in sequence

---

## Performance Tests

### Response Times
- [ ] Camera preset save: < 100ms
- [ ] Camera preset load: < 500ms (with animation)
- [ ] List presets: < 50ms
- [ ] Animate camera: Correct total duration
- [ ] Optimize GLTF: Reasonable for file size
- [ ] Generate component: < 2s for most models

### Memory Usage
- [ ] No memory leaks after repeated use
- [ ] Camera presets don't accumulate
- [ ] Optimized files are cleaned up
- [ ] Generated components don't duplicate

---

## Error Handling

### Camera Tools
- [ ] Load non-existent preset → error message
- [ ] Delete non-existent preset → error message
- [ ] Animate with invalid preset → error message
- [ ] Animate with empty array → error message

### GLTF Tools
- [ ] Optimize non-existent file → error message
- [ ] Optimize invalid GLTF → error message
- [ ] Invalid simplification ratio → error message
- [ ] Invalid texture format → error message

### Component Generation
- [ ] Export non-existent file → error message
- [ ] Invalid component name → error message
- [ ] Invalid mode → error message

### Bridge
- [ ] Command when bridge disconnected → error message
- [ ] Malformed command → error message
- [ ] Timeout on slow response → error message

---

## Regression Tests (Existing Features)

### Scene Inspection (4 tools)
- [ ] `get_scene_state` - Returns full hierarchy
- [ ] `find_objects` - Searches by name
- [ ] `get_object_position` - Returns position
- [ ] `log_positions` - Exports code

### Camera Basic (1 tool)
- [ ] `set_camera_position` - Still works

### Asset Processing (2 existing tools)
- [ ] `analyze_gltf` - Still works
- [ ] `validate_asset` - Still works

### Hierarchy (7 tools)
- [ ] All spawn/destroy/move/transform tools work

### Physics (4 tools)
- [ ] All physics tools work

### Materials (4 tools)
- [ ] All material tools work

---

## Documentation Tests

- [ ] RELEASE_NOTES_v1.3.0.md is accurate
- [ ] TESTING_v1.3.0.md commands work
- [ ] ROADMAP.md reflects Phase 2 completion
- [ ] README.md includes Phase 2 features
- [ ] All code examples are correct

---

## Publishing Checklist (After Testing)

- [ ] All tests pass
- [ ] Version is 1.3.0 in package.json
- [ ] Build completes without errors (`npm run build`)
- [ ] Compatibility test passes (`npm run test:compatibility`)
- [ ] README.md updated
- [ ] CHANGELOG.md created
- [ ] Git tag created (v1.3.0)
- [ ] Published to npm (`npm publish`)
- [ ] GitHub release created
- [ ] threlte-mcp repo updated

---

## Test Results

**Date:** __________
**Tester:** __________
**Environment:**
- OS: Windows 11
- Node: v18+
- Browser: __________
- IDE: Antigravity

**Summary:**
- Total Tests: 150+
- Passed: ____
- Failed: ____
- Skipped: ____

**Critical Issues Found:**
1. ________________________________
2. ________________________________
3. ________________________________

**Notes:**
_______________________________________
_______________________________________
_______________________________________

---

**Testing Status:** ⏳ Ready to Test

**Next Action:** Start Antigravity and begin testing with TESTING_v1.3.0.md
