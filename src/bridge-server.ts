/**
 * Threlte MCP - WebSocket Bridge Server
 *
 * Provides a WebSocket server that game clients connect to for real-time
 * scene inspection and manipulation by AI agents.
 */

import { WebSocketServer, WebSocket, type RawData } from 'ws';

export interface MCPCommand {
    action: string;
    requestId?: string;
    maxDepth?: number;
    name?: string;
    path?: string;
    position?: number[];
    rotation?: number[];
    scale?: number[];
    lookAt?: number[];
    fov?: number;
    near?: number;
    far?: number;
    filter?: {
        nameContains?: string;
        type?: string;
        hasUserData?: string;
    };
    id?: string;
    type?: string;
    material?: { color?: string; metalness?: number; roughness?: number };
    parent?: string;
    visible?: boolean;
    newName?: string;
    offset?: number[];
    colliders?: string;
    mass?: number;
    friction?: number;
    restitution?: number;
    gravityScale?: number;
    vector?: number[];
    url?: string;
    preset?: string;
    prop?: string;
    value?: string | number | boolean;
    background?: string;
    color?: string;
    sheet?: string;
    sequence?: string;
    rate?: number;
    range?: [number, number];
    reverse?: boolean;
    time?: number;
    object?: string;
    key?: string;
    event?: string;
    payload?: object;
    questId?: string;
    status?: string;
    progress?: number;
    category?: string;
    vibe?: string;
    targets?: string;
    properties?: string[];
    intensity?: number;
    animate?: boolean;
    duration?: number;
}

interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timeout: NodeJS.Timeout;
}

export interface BridgeServerOptions {
    port?: number;
    commandTimeout?: number;
}

export class BridgeServer {
    private wss: WebSocketServer | null = null;
    private client: WebSocket | null = null;
    private pendingRequests: Map<string, PendingRequest> = new Map();
    private requestId = 0;
    private lastSceneState: unknown = null;
    private listening = false;
    private lastError: string | null = null;
    private startupError: string | null = null;
    private port: number;
    private commandTimeout: number;

    constructor(options: BridgeServerOptions = {}) {
        this.port = options.port ?? 8083;
        this.commandTimeout = options.commandTimeout ?? 5000;
        this.startServer();
    }

    private startServer() {
        try {
            console.error(`[BridgeServer] Starting WebSocket server on port ${this.port}...`);
            this.wss = new WebSocketServer({ port: this.port });

            this.wss.on('listening', () => {
                console.error(`[BridgeServer] WebSocket server listening on port ${this.port}`);
                this.listening = true;
                this.startupError = null;
            });

            this.wss.on('connection', (ws: WebSocket) => {
                console.error('[BridgeServer] Game client connected');
                this.client = ws;

                ws.on('message', (data: RawData) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('[BridgeServer] Failed to parse message:', error);
                    }
                });

                ws.on('close', () => {
                    console.error('[BridgeServer] Game client disconnected');
                    this.client = null;
                });

                ws.on('error', (error) => {
                    console.error('[BridgeServer] Client error:', error);
                    this.lastError = error.message;
                });
            });

            this.wss.on('error', (error) => {
                console.error('[BridgeServer] Server error:', error);
                this.startupError = error.message;
                this.listening = false;
            });

        } catch (error) {
            console.error('[BridgeServer] Failed to start server:', error);
            this.startupError = (error as Error).message;
        }
    }

    getStatus() {
        return {
            listening: this.listening,
            port: this.port,
            connected: this.client !== null && this.client.readyState === WebSocket.OPEN,
            startupError: this.startupError,
            lastError: this.lastError,
            pendingRequests: this.pendingRequests.size
        };
    }

    isConnected(): boolean {
        return this.client !== null && this.client.readyState === WebSocket.OPEN;
    }

    async waitForConnection(timeoutMs = 10000): Promise<void> {
        if (this.isConnected()) return;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for game client to connect'));
            }, timeoutMs);

            const interval = setInterval(() => {
                if (this.isConnected()) {
                    clearTimeout(timeout);
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    async connect(): Promise<void> {
        return this.waitForConnection();
    }

    private handleMessage(message: unknown) {
        if (typeof message === 'object' && message !== null && 'data' in message) {
            this.lastSceneState = message;
        }

        if (
            typeof message === 'object' &&
            message !== null &&
            'requestId' in message
        ) {
            const { requestId, ...data } = message as { requestId: string } & Record<string, unknown>;
            const pending = this.pendingRequests.get(requestId);
            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(requestId);
                pending.resolve(data);
            }
        }
    }

    async sendCommand(command: MCPCommand): Promise<unknown> {
        if (!this.isConnected()) {
            throw new Error('No game client connected');
        }

        const requestId = `req_${++this.requestId}`;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                if (command.action === 'getFullSceneState' || command.action === 'findObjects') {
                    resolve(this.lastSceneState);
                } else {
                    reject(new Error('Command timeout'));
                }
            }, this.commandTimeout);

            this.pendingRequests.set(requestId, { resolve, reject, timeout });

            try {
                this.client!.send(
                    JSON.stringify({
                        ...command,
                        requestId,
                    })
                );
            } catch (error) {
                clearTimeout(timeout);
                this.pendingRequests.delete(requestId);
                reject(error);
            }
        });
    }

    close() {
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
        this.client = null;
        this.pendingRequests.forEach((req) => {
            clearTimeout(req.timeout);
            req.reject(new Error('Server closed'));
        });
        this.pendingRequests.clear();
    }
}
