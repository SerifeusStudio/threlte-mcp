# Threlte MCP Enhancement Roadmap

## Current State (v1.3.0) 🎉

### ✅ Implemented Features
- **Scene Inspection** (4 tools) - Query scene hierarchy, find objects
- **Camera Controls** (5 tools) - Position, presets, animation
- **Hierarchy Management** (6 tools) - Spawn, destroy, transform objects
- **Physics Control** (5 tools) - Rapier integration for physics
- **Asset Processing** (3 tools) - Analysis, validation, optimization
- **Svelte Generation** (1 tool) - Auto-generate Threlte components
- **Materials & Assets** (4 tools) - Material application, GLTF loading
- **Vibe Presets** (1 tool) - Mood-based scene styling
- **Utilities** (1 tool) - Bridge status

**Total:** 30 tools

### 🏆 Completed Phases
- ✅ **Phase 1**: Advanced Asset Processing (v1.1.0)
- ✅ **Phase 2**: Camera & View Controls (v1.2.0 - v1.3.0)

---

## Features to Port from Three.js MCP Ecosystem

### 🔍 Research Sources
Based on analysis of:
- [three-js-mcp](https://github.com/locchung/three-js-mcp) - Basic Three.js control
- [MCP Three](https://github.com/basementstudio/mcp-three) - GLTF processing & optimization
- [3D Asset Processing MCP](https://mcpmarket.com/server/3d-asset-processing) - Asset validation

---

## ✅ Phase 1: Advanced Asset Processing (COMPLETED in v1.1.0)

### From: MCP Three + 3D Asset Processing MCP

**New Tools:**

1. **`analyze_gltf`** - Deep analysis of GLTF/GLB files
   ```typescript
   {
     name: 'analyze_gltf',
     description: 'Analyze GLTF/GLB structure: meshes, materials, animations, bones',
     input: { url: string }
     output: {
       meshCount, materialCount, animationCount,
       totalVertices, totalTriangles,
       textureFormats, fileSize, hierarchy
     }
   }
   ```

2. **`optimize_gltf`** - Optimize loaded models
   ```typescript
   {
     name: 'optimize_gltf',
     description: 'Optimize mesh: merge geometries, simplify, compress textures',
     input: { name: string, options: OptimizationOptions }
     // Uses gltf-transform library
   }
   ```

3. **`validate_asset`** - Check asset health
   ```typescript
   {
     name: 'validate_asset',
     description: 'Validate GLTF against best practices, find issues',
     input: { url: string }
     output: { errors: [], warnings: [], suggestions: [] }
   }
   ```

4. **`export_to_svelte`** - Generate Threlte component code
   ```typescript
   {
     name: 'export_to_svelte',
     description: 'Generate Threlte component from GLTF with TypeScript types',
     input: { name: string, componentName: string }
     output: { svelteCode: string, tsTypes: string }
   }
   ```

**Why This Matters for Threlte:**
- Threlte developers constantly work with GLTF assets
- Optimization is crucial for web performance
- Code generation speeds up development
- Asset validation prevents runtime issues

---

## ✅ Phase 2: Camera & View Controls (COMPLETED in v1.2.0 - v1.3.0)

### Gap Analysis
Current: No camera manipulation tools
Needed: Full camera control for cinematics, debugging

**New Tools:**

5. **`set_camera_position`** - Position active camera
   ```typescript
   {
     name: 'set_camera_position',
     description: 'Set camera position, lookAt target, FOV',
     input: {
       position: [x, y, z],
       lookAt?: [x, y, z],
       fov?: number
     }
   }
   ```

6. **`save_camera_preset`** - Save camera views
   ```typescript
   {
     name: 'save_camera_preset',
     description: 'Save current camera view as preset',
     input: { presetName: string }
   }
   ```

7. **`load_camera_preset`** - Load saved views
   ```typescript
   {
     name: 'load_camera_preset',
     description: 'Apply saved camera preset',
     input: { presetName: string, animate?: boolean }
   }
   ```

8. **`fly_camera_path`** - Cinematic camera movement
   ```typescript
   {
     name: 'fly_camera_path',
     description: 'Animate camera along path with easing',
     input: {
       waypoints: [[x,y,z]],
       duration: number,
       easing: 'linear' | 'easeInOut' | 'custom'
     }
   }
   ```

---

## Phase 3: Advanced Lighting (Priority: MEDIUM)

### Current State
Basic light addition exists, but limited control

**New Tools:**

9. **`add_light_rig`** - Pre-configured lighting setups
   ```typescript
   {
     name: 'add_light_rig',
     description: 'Add professional lighting rigs (3-point, studio, outdoor)',
     input: {
       preset: 'threePoint' | 'studio' | 'outdoor' | 'dramatic',
       intensity: number
     }
   }
   ```

10. **`bake_lighting`** - Lightmap generation
    ```typescript
    {
      name: 'bake_lighting',
      description: 'Bake lighting into lightmaps for performance',
      input: { targets: string[], resolution: number }
    }
    ```

11. **`analyze_lighting`** - Scene lighting analysis
    ```typescript
    {
      name: 'analyze_lighting',
      description: 'Analyze scene lighting: coverage, balance, shadows',
      output: {
        totalLights, lightTypes,
        shadowCasters, ambientLevel,
        recommendations: []
      }
    }
    ```

---

## Phase 4: Performance Profiling (Priority: HIGH)

### Unique to Threlte MCP
No other Three.js MCP has this!

**New Tools:**

12. **`profile_scene`** - Performance analysis
    ```typescript
    {
      name: 'profile_scene',
      description: 'Profile scene: draw calls, vertices, memory, FPS',
      output: {
        fps, drawCalls, vertices, triangles,
        memoryUsage, bottlenecks: []
      }
    }
    ```

13. **`suggest_optimizations`** - AI-powered optimization suggestions
    ```typescript
    {
      name: 'suggest_optimizations',
      description: 'Analyze scene and suggest performance improvements',
      output: {
        suggestions: [
          { issue: string, severity: 'high' | 'medium' | 'low', fix: string }
        ]
      }
    }
    ```

14. **`enable_lod`** - Auto-generate LOD
    ```typescript
    {
      name: 'enable_lod',
      description: 'Generate and apply LOD (Level of Detail) to meshes',
      input: {
        targets: string[],
        levels: number,
        distanceFactors: number[]
      }
    }
    ```

---

## Phase 5: Post-Processing & Effects (Priority: MEDIUM)

### Threlte's @threlte/extras Integration

**New Tools:**

15. **`add_post_effect`** - Post-processing effects
    ```typescript
    {
      name: 'add_post_effect',
      description: 'Add post-processing: bloom, AO, DOF, motion blur',
      input: {
        effect: 'bloom' | 'ssao' | 'dof' | 'motionBlur',
        params: EffectParams
      }
    }
    ```

16. **`create_particle_system`** - Particle effects
    ```typescript
    {
      name: 'create_particle_system',
      description: 'Create particle systems: fire, smoke, rain, magic',
      input: {
        type: 'fire' | 'smoke' | 'rain' | 'custom',
        position: [x, y, z],
        count: number
      }
    }
    ```

---

## Phase 6: Shader & Material System (Priority: LOW)

### Advanced Material Control

**New Tools:**

17. **`create_custom_shader`** - Custom shader materials
    ```typescript
    {
      name: 'create_custom_shader',
      description: 'Create custom shader material with GLSL',
      input: {
        name: string,
        vertexShader: string,
        fragmentShader: string,
        uniforms: Record<string, any>
      }
    }
    ```

18. **`apply_shader_preset`** - Pre-made shader effects
    ```typescript
    {
      name: 'apply_shader_preset',
      description: 'Apply shader presets: hologram, water, toon, glass',
      input: {
        target: string,
        preset: 'hologram' | 'water' | 'toon' | 'glass'
      }
    }
    ```

---

## Phase 7: Scene Composition (Priority: HIGH)

### Game-Specific Features

**New Tools:**

19. **`create_scene_layout`** - Procedural layouts
    ```typescript
    {
      name: 'create_scene_layout',
      description: 'Generate scene layouts: city, forest, dungeon',
      input: {
        type: 'city' | 'forest' | 'dungeon',
        seed: number,
        size: [width, height]
      }
    }
    ```

20. **`place_on_surface`** - Smart object placement
    ```typescript
    {
      name: 'place_on_surface',
      description: 'Place object on surface with physics raycast',
      input: {
        object: string,
        targetSurface: string,
        align: boolean
      }
    }
    ```

21. **`scatter_objects`** - Object scattering
    ```typescript
    {
      name: 'scatter_objects',
      description: 'Scatter objects on surface (trees, rocks, props)',
      input: {
        objectType: string,
        surface: string,
        count: number,
        randomization: { scale: [min,max], rotation: boolean }
      }
    }
    ```

---

## Phase 8: Animation & Timeline (Priority: MEDIUM)

### Beyond Theatre.js Integration

**New Tools:**

22. **`record_animation`** - Record object movements
    ```typescript
    {
      name: 'record_animation',
      description: 'Record real-time movements as animation',
      input: { targets: string[], duration: number }
    }
    ```

23. **`create_animation_clip`** - Manual keyframe animation
    ```typescript
    {
      name: 'create_animation_clip',
      description: 'Create animation from keyframes',
      input: {
        name: string,
        track: { time: number, value: any }[]
      }
    }
    ```

---

## Phase 9: Debugging & Visualization (Priority: MEDIUM)

### Developer Tools

**New Tools:**

24. **`show_debug_info`** - Visual debugging overlays
    ```typescript
    {
      name: 'show_debug_info',
      description: 'Show debug info: normals, bounds, wireframe, axes',
      input: {
        target: string,
        show: ['normals', 'bounds', 'wireframe', 'axes']
      }
    }
    ```

25. **`measure_distance`** - Scene measurements
    ```typescript
    {
      name: 'measure_distance',
      description: 'Measure distance between objects/points',
      input: { from: [x,y,z] | string, to: [x,y,z] | string }
    }
    ```

---

## Implementation Priority Matrix

| Phase | Priority | Difficulty | Impact | Est. Time |
|-------|----------|------------|--------|-----------|
| Phase 1: Asset Processing | 🔴 HIGH | Medium | ⭐⭐⭐⭐⭐ | 2 weeks |
| Phase 2: Camera Controls | 🔴 HIGH | Low | ⭐⭐⭐⭐ | 1 week |
| Phase 4: Performance Profiling | 🔴 HIGH | High | ⭐⭐⭐⭐⭐ | 3 weeks |
| Phase 7: Scene Composition | 🔴 HIGH | Medium | ⭐⭐⭐⭐ | 2 weeks |
| Phase 3: Advanced Lighting | 🟡 MEDIUM | Medium | ⭐⭐⭐ | 1.5 weeks |
| Phase 5: Post-Processing | 🟡 MEDIUM | Medium | ⭐⭐⭐ | 2 weeks |
| Phase 8: Animation | 🟡 MEDIUM | High | ⭐⭐⭐ | 2 weeks |
| Phase 9: Debugging | 🟡 MEDIUM | Low | ⭐⭐ | 1 week |
| Phase 6: Shader System | 🟢 LOW | High | ⭐⭐ | 3 weeks |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@gltf-transform/core": "^4.0.0",
    "@gltf-transform/functions": "^4.0.0",
    "three-mesh-bvh": "^0.7.0",
    "postprocessing": "^6.35.0"
  }
}
```

---

## Community Feedback

Vote on features: [GitHub Discussions](https://github.com/RaulContreras123/threlte-mcp/discussions)

---

## Sources & Inspiration

- [three-js-mcp](https://github.com/locchung/three-js-mcp) - Basic Three.js control
- [MCP Three](https://github.com/basementstudio/mcp-three) - GLTF processing
- [3D Asset Processing MCP](https://mcpmarket.com/server/3d-asset-processing) - Asset validation
- [Three.js Documentation](https://threejs.org/docs/)
- [Threlte Extras](https://threlte.xyz/docs/reference/extras)
- [glTF-Transform](https://gltf-transform.dev/)

---

**Next Version:** v1.1.0 will include Phase 1 (Asset Processing) + Phase 2 (Camera Controls)

**Estimated Release:** March 2026
