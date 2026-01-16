/**
 * MCPBridge - Client-side WebSocket bridge for threlte-mcp
 * 
 * Enables real-time Three.js/Threlte scene manipulation via MCP commands.
 * Auto-connects in development mode (import.meta.env.DEV).
 * 
 * @example
 * ```typescript
 * import { MCPBridge } from 'threlte-mcp/client';
 * 
 * // Create bridge (auto-connects in dev mode)
 * const bridge = new MCPBridge(scene);
 * 
 * // Call update() in your render loop for animations
 * bridge.update();
 * ```
 */

import * as THREE from 'three';

export interface MCPBridgeOptions {
    /** WebSocket URL (default: ws://127.0.0.1:8083) */
    url?: string;
    /** Auto-connect on creation (default: true in dev mode) */
    autoConnect?: boolean;
    /** Reconnect delay in ms (default: 60000) */
    reconnectDelay?: number;
    /** Max tree depth for scene state (default: 10) */
    maxDepth?: number;
}

interface MCPCommand {
    action: string;
    requestId?: string;
    [key: string]: unknown;
}

interface SceneObjectData {
    name: string;
    path: string;
    type: string;
    position: string;
    children: number;
}

interface CameraTween {
    startTime: number;
    duration: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    fromLookAt?: THREE.Vector3;
    toLookAt?: THREE.Vector3;
    fromFov?: number;
    toFov?: number;
    fromNear?: number;
    toNear?: number;
    fromFar?: number;
    toFar?: number;
}

export class MCPBridge {
    private ws: WebSocket | null = null;
    private scene: THREE.Scene;
    private reconnectTimeout: number | null = null;
    private options: Required<MCPBridgeOptions>;
    private rotatingObjects: Map<string, { speed: number }> = new Map();
    private objects: Map<string, THREE.Object3D> = new Map();
    private cameraTween: CameraTween | null = null;
    private cameraLookAt: THREE.Vector3 | null = null;

    constructor(scene: THREE.Scene, options: MCPBridgeOptions = {}) {
        this.scene = scene;

        // Determine if we should auto-connect
        const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;
        const envEnabled = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MCP_ENABLED === 'true';
        const localStorageEnabled = typeof window !== 'undefined' &&
            window.localStorage?.getItem('MCP_ENABLED') === 'true';

        this.options = {
            url: options.url ?? 'ws://127.0.0.1:8083',
            autoConnect: options.autoConnect ?? (isDev || envEnabled || localStorageEnabled),
            reconnectDelay: options.reconnectDelay ?? 60000,
            maxDepth: options.maxDepth ?? 10,
        };

        if (this.options.autoConnect) {
            console.log('[MCPBridge] 🔌 Auto-connecting to MCP server...');
            this.connect();
        }

        // Expose for console debugging
        if (typeof window !== 'undefined') {
            (window as any).mcpBridge = this;
        }
    }

    /**
     * Connect to the MCP WebSocket server
     */
    connect(): void {
        try {
            this.ws = new WebSocket(this.options.url);

            this.ws.onopen = () => {
                console.log('[MCPBridge] ✅ Connected to MCP server');
                this.sendSceneState();
            };

            this.ws.onmessage = (event) => {
                try {
                    const command: MCPCommand = JSON.parse(event.data);
                    this.handleCommand(command);
                } catch (error) {
                    console.error('[MCPBridge] Failed to parse command:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[MCPBridge] WebSocket error:', error);
            };

            this.ws.onclose = (event) => {
                console.warn(`[MCPBridge] Disconnected (Code: ${event.code})`);
                this.scheduleReconnect();
            };
        } catch (error) {
            this.scheduleReconnect();
        }
    }

    /**
     * Disconnect from the MCP server
     */
    disconnect(): void {
        if (this.reconnectTimeout !== null) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Update loop - call this in your render/animation loop
     */
    update(): void {
        // Handle rotating objects
        for (const [id, data] of this.rotatingObjects) {
            const obj = this.objects.get(id) || this.scene.getObjectByName(id);
            if (obj) {
                obj.rotation.y += data.speed * 0.016; // Assume ~60fps
            }
        }

        if (this.cameraTween) {
            const camera = this.getActiveCamera();
            if (!camera) {
                this.cameraTween = null;
                return;
            }

            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const duration = Math.max(0, this.cameraTween.duration);
            const t = duration === 0 ? 1 : Math.min(1, (now - this.cameraTween.startTime) / duration);

            camera.position.lerpVectors(this.cameraTween.from, this.cameraTween.to, t);

            if (this.cameraTween.toLookAt) {
                const fromLookAt = this.cameraTween.fromLookAt ?? this.cameraTween.toLookAt;
                const currentLookAt = new THREE.Vector3().lerpVectors(fromLookAt, this.cameraTween.toLookAt, t);
                camera.lookAt(currentLookAt);
                this.cameraLookAt = currentLookAt;
            }

            const isPerspective = (camera as THREE.PerspectiveCamera).isPerspectiveCamera;
            if (isPerspective) {
                const perspective = camera as THREE.PerspectiveCamera;
                let lensChanged = false;

                if (typeof this.cameraTween.fromFov === 'number' && typeof this.cameraTween.toFov === 'number') {
                    perspective.fov = lerpNumber(this.cameraTween.fromFov, this.cameraTween.toFov, t);
                    lensChanged = true;
                }
                if (typeof this.cameraTween.fromNear === 'number' && typeof this.cameraTween.toNear === 'number') {
                    perspective.near = lerpNumber(this.cameraTween.fromNear, this.cameraTween.toNear, t);
                    lensChanged = true;
                }
                if (typeof this.cameraTween.fromFar === 'number' && typeof this.cameraTween.toFar === 'number') {
                    perspective.far = lerpNumber(this.cameraTween.fromFar, this.cameraTween.toFar, t);
                    lensChanged = true;
                }

                if (lensChanged) {
                    perspective.updateProjectionMatrix();
                }
            }

            if (t >= 1) {
                this.cameraTween = null;
            }
        }
    }

    /**
     * Check if connected to MCP server
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    private scheduleReconnect(): void {
        if (this.reconnectTimeout !== null) {
            clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = window.setTimeout(() => {
            this.connect();
        }, this.options.reconnectDelay);
    }

    private sendSceneState(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const state = this.getSceneState();
            this.ws.send(JSON.stringify({ data: state }));
        }
    }

    private sendResponse(requestId: string | undefined, data: unknown): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && requestId) {
            const payload = typeof data === 'object' && data !== null ? data : { data };
            this.ws.send(JSON.stringify({ requestId, ...payload }));
        }
    }

    private handleCommand(command: MCPCommand): void {
        const { action, requestId } = command;
        let result: unknown;

        try {
            switch (action) {
                // Scene Inspection
                case 'getFullSceneState':
                    result = { success: true, data: this.getSceneState(command.maxDepth as number) };
                    break;

                case 'findObjects':
                    result = { success: true, data: this.findObjects(command as any) };
                    break;

                // Object Manipulation
                case 'moveObject':
                case 'moveSceneObject':
                    result = this.moveObject(command.name as string || command.path as string, command.position as number[]);
                    break;

                case 'setRotation':
                    result = this.setTransform(command.name as string, 'rotation', command.rotation as number[]);
                    break;

                case 'setScale':
                    result = this.setTransform(command.name as string, 'scale', command.scale as number[]);
                    break;

                case 'setVisibility':
                    result = this.setVisibility(command.name as string, command.visible as boolean);
                    break;

                case 'lookAt':
                    result = this.lookAt(command.name as string, command.target as number[]);
                    break;

                case 'setOpacity':
                    result = this.setOpacity(command.name as string, command.opacity as number);
                    break;

                // Camera
                case 'getCameraState':
                    result = { success: true, data: this.getCameraState() };
                    break;

                case 'setCameraPosition':
                    result = this.setCameraPosition(command);
                    break;

                // Object Lifecycle
                case 'addObject':
                case 'addPrimitive':
                    result = this.addPrimitive(command as any);
                    break;

                case 'removeObject':
                    result = this.removeObject(command.name as string || command.id as string);
                    break;

                case 'duplicateObject':
                    result = this.duplicateObject(command.name as string, command.newName as string, command.offset as number[]);
                    break;

                // Animation
                case 'startRotation':
                    this.rotatingObjects.set(command.id as string, { speed: (command.speed as number) || 1 });
                    result = { success: true };
                    break;

                case 'stopRotation':
                    this.rotatingObjects.delete(command.id as string);
                    result = { success: true };
                    break;

                // Lights
                case 'addLight':
                    result = this.addLight(command as any);
                    break;

                default:
                    result = { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            result = { success: false, error: (error as Error).message };
        }

        this.sendResponse(requestId, result);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SCENE INSPECTION
    // ═══════════════════════════════════════════════════════════════════════════

    getSceneState(maxDepth?: number): SceneObjectData[] {
        const depth = maxDepth ?? this.options.maxDepth;
        const result: SceneObjectData[] = [];

        const traverse = (obj: THREE.Object3D, currentDepth: number, path: string) => {
            if (currentDepth > depth) return;

            const pos = obj.position;
            result.push({
                name: obj.name || `[${obj.type}]`,
                path: path,
                type: obj.type,
                position: `[${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}]`,
                children: obj.children.length,
            });

            obj.children.forEach((child, i) => {
                traverse(child, currentDepth + 1, `${path}/${child.name || i}`);
            });
        };

        this.scene.children.forEach((child, i) => {
            traverse(child, 0, child.name || String(i));
        });

        // Log to console as table
        console.table(result);
        return result;
    }

    findObjects(filter: { name?: string; nameContains?: string; type?: string }): SceneObjectData[] {
        const results: SceneObjectData[] = [];

        this.scene.traverse((obj) => {
            let match = true;

            if (filter.name && obj.name !== filter.name) match = false;
            if (filter.nameContains && !obj.name.includes(filter.nameContains)) match = false;
            if (filter.type && obj.type !== filter.type) match = false;

            if (match && (filter.name || filter.nameContains || filter.type)) {
                const pos = obj.position;
                results.push({
                    name: obj.name || `[${obj.type}]`,
                    path: this.getObjectPath(obj),
                    type: obj.type,
                    position: `[${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}]`,
                    children: obj.children.length,
                });
            }
        });

        return results;
    }

    private getObjectPath(obj: THREE.Object3D): string {
        const parts: string[] = [];
        let current: THREE.Object3D | null = obj;
        while (current && current !== this.scene) {
            parts.unshift(current.name || current.type);
            current = current.parent;
        }
        return parts.join('/');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OBJECT MANIPULATION
    // ═══════════════════════════════════════════════════════════════════════════

    private findObject(nameOrPath: string): THREE.Object3D | null {
        // Try direct name lookup first
        const direct = this.objects.get(nameOrPath) ?? this.scene.getObjectByName(nameOrPath);
        if (direct) return direct;

        // Try path-based lookup
        const parts = nameOrPath.split('/');
        let current: THREE.Object3D = this.scene;
        for (const part of parts) {
            const child = current.children.find((node) => node.name === part || node.type === part);
            if (!child) return null;
            current = child;
        }
        return current === this.scene ? null : current;
    }

    private moveObject(nameOrPath: string, position: number[]): { success: boolean; error?: string } {
        const obj = this.findObject(nameOrPath);
        if (!obj) return { success: false, error: `Object not found: ${nameOrPath}` };

        obj.position.set(position[0], position[1], position[2]);
        return { success: true };
    }

    private setTransform(name: string, prop: 'rotation' | 'scale', values: number[]): { success: boolean; error?: string } {
        const obj = this.findObject(name);
        if (!obj) return { success: false, error: `Object not found: ${name}` };

        if (prop === 'rotation') {
            obj.rotation.set(values[0], values[1], values[2]);
        } else {
            obj.scale.set(values[0], values[1], values[2]);
        }
        return { success: true };
    }

    private setVisibility(name: string, visible: boolean): { success: boolean; error?: string } {
        const obj = this.findObject(name);
        if (!obj) return { success: false, error: `Object not found: ${name}` };

        obj.visible = visible;
        return { success: true };
    }

    private lookAt(name: string, target: number[]): { success: boolean; error?: string } {
        const obj = this.findObject(name);
        if (!obj) return { success: false, error: `Object not found: ${name}` };

        obj.lookAt(target[0], target[1], target[2]);
        return { success: true };
    }

    private setOpacity(name: string, opacity: number): { success: boolean; error?: string } {
        const obj = this.findObject(name);
        if (!obj) return { success: false, error: `Object not found: ${name}` };

        obj.traverse((child) => {
            if ((child as THREE.Mesh).material) {
                const mat = (child as THREE.Mesh).material as THREE.Material;
                mat.transparent = opacity < 1;
                mat.opacity = opacity;
            }
        });
        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CAMERA
    // ═══════════════════════════════════════════════════════════════════════════

    private getActiveCamera(): THREE.Camera | null {
        return this.scene.getObjectByProperty('isCamera', true) as THREE.Camera | null;
    }

    private getCameraLookAt(camera: THREE.Camera): THREE.Vector3 {
        if (this.cameraLookAt) {
            return this.cameraLookAt.clone();
        }

        const direction = new THREE.Vector3(0, 0, -1);
        if (typeof camera.getWorldDirection === 'function') {
            camera.getWorldDirection(direction);
        }

        return camera.position.clone().add(direction);
    }

    private getCameraState(): object {
        const camera = this.getActiveCamera();
        if (!camera) return { error: 'No camera found' };

        const lookAt = this.getCameraLookAt(camera);
        const state: Record<string, unknown> = {
            position: [camera.position.x, camera.position.y, camera.position.z],
            rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
            lookAt: [lookAt.x, lookAt.y, lookAt.z],
        };

        if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
            const perspective = camera as THREE.PerspectiveCamera;
            state.fov = perspective.fov;
            state.near = perspective.near;
            state.far = perspective.far;
        }

        return state;
    }

    private setCameraPosition(command: MCPCommand): { success: boolean; error?: string } {
        const camera = this.getActiveCamera();
        if (!camera) return { success: false, error: 'No camera found' };

        const position = command.position as number[] | undefined;
        if (!position || position.length !== 3) {
            return { success: false, error: 'Invalid camera position' };
        }

        const targetPosition = new THREE.Vector3(position[0], position[1], position[2]);
        const targetLookAt = Array.isArray(command.lookAt)
            ? new THREE.Vector3(command.lookAt[0], command.lookAt[1], command.lookAt[2])
            : null;

        const animate = Boolean(command.animate);
        const duration = typeof command.duration === 'number' && Number.isFinite(command.duration)
            ? Math.max(0, command.duration)
            : 0;

        const isPerspective = (camera as THREE.PerspectiveCamera).isPerspectiveCamera;
        const perspective = camera as THREE.PerspectiveCamera;
        const wantsLens = isPerspective && (
            typeof command.fov === 'number' ||
            typeof command.near === 'number' ||
            typeof command.far === 'number'
        );

        if (animate && duration > 0) {
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const tween: CameraTween = {
                startTime: now,
                duration,
                from: camera.position.clone(),
                to: targetPosition,
            };

            if (targetLookAt) {
                tween.fromLookAt = this.getCameraLookAt(camera);
                tween.toLookAt = targetLookAt;
            }

            if (wantsLens) {
                tween.fromFov = perspective.fov;
                tween.fromNear = perspective.near;
                tween.fromFar = perspective.far;
                tween.toFov = typeof command.fov === 'number' ? command.fov : perspective.fov;
                tween.toNear = typeof command.near === 'number' ? command.near : perspective.near;
                tween.toFar = typeof command.far === 'number' ? command.far : perspective.far;
            }

            this.cameraTween = tween;
            return { success: true };
        }

        this.cameraTween = null;
        camera.position.copy(targetPosition);

        if (targetLookAt) {
            camera.lookAt(targetLookAt);
            this.cameraLookAt = targetLookAt;
        }

        if (wantsLens) {
            if (typeof command.fov === 'number') {
                perspective.fov = command.fov;
            }
            if (typeof command.near === 'number') {
                perspective.near = command.near;
            }
            if (typeof command.far === 'number') {
                perspective.far = command.far;
            }
            perspective.updateProjectionMatrix();
        }

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OBJECT CREATION
    // ═══════════════════════════════════════════════════════════════════════════

    private addPrimitive(cmd: { type: string; name?: string; position?: number[]; color?: string; size?: number[] }): { success: boolean; id?: string; error?: string } {
        let geometry: THREE.BufferGeometry;
        const size = cmd.size || [1, 1, 1];

        switch (cmd.type?.toLowerCase()) {
            case 'cube':
            case 'box':
                geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(size[0] / 2, 32, 32);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(size[0] / 2, size[0] / 2, size[1], 32);
                break;
            case 'plane':
                geometry = new THREE.PlaneGeometry(size[0], size[1]);
                break;
            default:
                return { success: false, error: `Unknown primitive type: ${cmd.type}` };
        }

        const material = new THREE.MeshStandardMaterial({
            color: cmd.color || '#ffffff',
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = cmd.name || `mcp_${cmd.type}_${Date.now()}`;

        if (cmd.position) {
            mesh.position.set(cmd.position[0], cmd.position[1], cmd.position[2]);
        }

        this.scene.add(mesh);
        this.objects.set(mesh.name, mesh);

        return { success: true, id: mesh.name };
    }

    private removeObject(name: string): { success: boolean; error?: string } {
        const obj = this.findObject(name);
        if (!obj) return { success: false, error: `Object not found: ${name}` };

        obj.removeFromParent();
        this.objects.delete(name);
        this.rotatingObjects.delete(name);

        return { success: true };
    }

    private duplicateObject(sourceName: string, newName: string, offset?: number[]): { success: boolean; id?: string; error?: string } {
        const source = this.findObject(sourceName);
        if (!source) return { success: false, error: `Source object not found: ${sourceName}` };

        const clone = source.clone();
        clone.name = newName;

        if (offset) {
            clone.position.x += offset[0];
            clone.position.y += offset[1];
            clone.position.z += offset[2];
        }

        (source.parent || this.scene).add(clone);
        this.objects.set(newName, clone);

        return { success: true, id: newName };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LIGHTS
    // ═══════════════════════════════════════════════════════════════════════════

    private addLight(cmd: { type: string; name?: string; position?: number[]; color?: string; intensity?: number }): { success: boolean; id?: string; error?: string } {
        let light: THREE.Light;
        const color = cmd.color || '#ffffff';
        const intensity = cmd.intensity ?? 1;

        switch (cmd.type?.toLowerCase()) {
            case 'point':
                light = new THREE.PointLight(color, intensity);
                break;
            case 'directional':
                light = new THREE.DirectionalLight(color, intensity);
                break;
            case 'spot':
                light = new THREE.SpotLight(color, intensity);
                break;
            case 'ambient':
                light = new THREE.AmbientLight(color, intensity);
                break;
            default:
                return { success: false, error: `Unknown light type: ${cmd.type}` };
        }

        light.name = cmd.name || `mcp_${cmd.type}Light_${Date.now()}`;

        if (cmd.position && 'position' in light) {
            (light as THREE.PointLight).position.set(cmd.position[0], cmd.position[1], cmd.position[2]);
        }

        this.scene.add(light);
        this.objects.set(light.name, light);

        return { success: true, id: light.name };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
function lerpNumber(from: number, to: number, t: number): number {
    return from + (to - from) * t;
}

// SINGLETON HELPER
// ═══════════════════════════════════════════════════════════════════════════

let globalBridge: MCPBridge | null = null;

/**
 * Get or create the global MCPBridge instance
 */
export function getMCPBridge(scene?: THREE.Scene): MCPBridge | null {
    if (globalBridge) return globalBridge;
    if (scene) {
        globalBridge = new MCPBridge(scene);
        return globalBridge;
    }
    return null;
}

