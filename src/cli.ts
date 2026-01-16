#!/usr/bin/env node
/**
 * threlte-mcp setup CLI
 * 
 * Auto-generates MCP configuration for your IDE.
 * 
 * Usage:
 *   npx threlte-mcp setup
 */

import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

interface MCPConfig {
    mcpServers: {
        [key: string]: {
            command: string;
            args?: string[];
            cwd?: string;
        };
    };
}

const THRELTE_MCP_CONFIG = {
    command: 'npx',
    args: ['-y', 'threlte-mcp'],
};

async function exists(path: string): Promise<boolean> {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

async function findConfigPath(): Promise<{ path: string; type: 'antigravity' | 'cursor' | 'claude' | 'generic' }> {
    const home = homedir();

    // Antigravity (Gemini)
    const antigravityDir = join(home, '.gemini', 'antigravity');
    if (await exists(antigravityDir)) {
        return { path: join(antigravityDir, 'mcp_config.json'), type: 'antigravity' };
    }

    // Cursor
    const cursorDir = join(home, '.cursor');
    if (await exists(cursorDir)) {
        return { path: join(cursorDir, 'mcp.json'), type: 'cursor' };
    }

    // Claude Desktop
    const claudeDirWin = join(home, 'AppData', 'Roaming', 'Claude');
    if (await exists(claudeDirWin)) {
        return { path: join(claudeDirWin, 'claude_desktop_config.json'), type: 'claude' };
    }

    const claudeDirMac = join(home, 'Library', 'Application Support', 'Claude');
    if (await exists(claudeDirMac)) {
        return { path: join(claudeDirMac, 'claude_desktop_config.json'), type: 'claude' };
    }

    // Fall back to project-level config
    const projectPath = join(process.cwd(), 'mcp_config.json');
    return { path: projectPath, type: 'generic' };
}

async function readConfig(path: string): Promise<MCPConfig> {
    try {
        const content = await fs.readFile(path, 'utf-8');
        const parsed = JSON.parse(content) as MCPConfig;
        if (!parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
            parsed.mcpServers = {};
        }
        return parsed;
    } catch {
        return { mcpServers: {} };
    }
}

async function writeConfig(path: string, config: MCPConfig): Promise<void> {
    // Ensure directory exists
    const dir = dirname(path);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(path, JSON.stringify(config, null, 2), 'utf-8');
}

async function setup(): Promise<void> {
    console.log('🎮 threlte-mcp Setup');
    console.log('═══════════════════════════════════════');
    console.log('');

    const { path, type } = await findConfigPath();
    console.log(`📍 Config location: ${path}`);
    console.log(`📌 IDE type: ${type}`);
    console.log('');

    const config = await readConfig(path);

    // Check if already configured
    if (config.mcpServers['threlte-mcp'] || config.mcpServers['threlte']) {
        console.log('✅ threlte-mcp is already configured!');
        console.log('');
        printNextSteps();
        return;
    }

    // Add threlte-mcp config
    config.mcpServers['threlte-mcp'] = THRELTE_MCP_CONFIG;

    await writeConfig(path, config);

    console.log('✅ Added threlte-mcp to your MCP configuration!');
    console.log('');
    printNextSteps();
}

function printNextSteps(): void {
    console.log('═══════════════════════════════════════');
    console.log('📋 Next Steps:');
    console.log('');
    console.log('1. Restart your IDE to load the new MCP server');
    console.log('');
    console.log('2. Add the MCPBridge component to your Threlte app:');
    console.log('');
    console.log('   ```svelte');
    console.log('   <script>');
    console.log("     import { MCPBridgeComponent } from 'threlte-mcp/client';");
    console.log('   </script>');
    console.log('');
    console.log('   <MCPBridgeComponent />');
    console.log('   ```');
    console.log('');
    console.log('3. Run your app in development mode (npm run dev)');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🎮 The AI can now inspect and manipulate your scene!');
}

// Check if running as CLI
const args = process.argv.slice(2);

if (args[0] === 'setup') {
    setup().catch((error) => {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    });
} else if (args.length === 0 || args[0] === 'serve' || args[0] === 'start') {
    // Default: run the MCP server
    import('./index.js');
} else {
    console.log('threlte-mcp - MCP server for Three.js/Threlte scenes');
    console.log('');
    console.log('Commands:');
    console.log('  npx threlte-mcp          Start the MCP server');
    console.log('  npx threlte-mcp setup    Configure IDE for threlte-mcp');
    console.log('');
}
