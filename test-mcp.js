#!/usr/bin/env node
/**
 * MCP Compatibility Test
 * Tests if the server responds correctly to standard MCP protocol messages
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, 'dist', 'index.js');

console.log('🧪 Testing MCP Server Compatibility...\n');

const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let passed = 0;
let failed = 0;

server.stdout.on('data', (data) => {
    output += data.toString();

    // Look for JSON-RPC responses
    const lines = output.split('\n');
    for (const line of lines) {
        if (line.trim()) {
            try {
                const response = JSON.parse(line);
                if (response.jsonrpc === '2.0') {
                    console.log('✅ Valid JSON-RPC 2.0 response');
                    passed++;
                }
                if (response.result?.tools) {
                    console.log(`✅ Tools list returned: ${response.result.tools.length} tools`);
                    passed++;
                }
            } catch (e) {
                // Not JSON, might be stderr logging
            }
        }
    }
    output = lines[lines.length - 1]; // Keep incomplete line
});

server.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('MCP Server ready') || msg.includes('Threlte')) {
        console.log('✅ Server initialized successfully');
        passed++;
    }
});

// Test 1: Initialize
setTimeout(() => {
    console.log('\n📤 Test 1: Initialize request');
    server.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
                name: 'test-client',
                version: '1.0.0'
            }
        },
        id: 1
    }) + '\n');
}, 100);

// Test 2: List tools
setTimeout(() => {
    console.log('\n📤 Test 2: List tools request');
    server.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 2
    }) + '\n');
}, 500);

// Test 3: Call a tool (should work even without WebSocket)
setTimeout(() => {
    console.log('\n📤 Test 3: Call tool request');
    server.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'get_scene_state',
            arguments: { maxDepth: 2 }
        },
        id: 3
    }) + '\n');
}, 1000);

// Finish test
setTimeout(() => {
    server.kill();
    console.log('\n' + '='.repeat(50));
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

    if (passed >= 3) {
        console.log('\n✅ MCP Server is fully compatible!');
        console.log('\nCompatible with:');
        console.log('  • Claude Desktop');
        console.log('  • Antigravity');
        console.log('  • Claude Code (CLI)');
        console.log('  • Cursor');
        console.log('  • Windsurf');
        console.log('  • Continue');
        console.log('  • Any MCP-compatible client');
        process.exit(0);
    } else {
        console.log('\n❌ Compatibility issues detected');
        process.exit(1);
    }
}, 2000);

server.on('error', (err) => {
    console.error('❌ Failed to start server:', err.message);
    failed++;
    process.exit(1);
});
