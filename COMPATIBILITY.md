# IDE Compatibility Guide

`threlte-mcp` uses the standard Model Context Protocol (MCP) and is compatible with all MCP-supporting tools.

## ✅ Verified Compatible IDEs & Tools

### 1. **Claude Desktop**
Configuration file: `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

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

### 2. **Antigravity** (Google's AI IDE)
Configuration file: `~/.gemini/antigravity/mcp_config.json` (global) or `<project-root>/mcp_config.json` (project-level)

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

**Note:** Antigravity prefers project-level configs and supports advanced node.exe paths if needed.

### 3. **Claude Code** (CLI)
Configuration file: `~/.config/claude-code/config.json`

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

### 4. **Cursor**
Configuration: Settings → MCP Servers → Add Server

```json
{
  "threlte": {
    "command": "npx",
    "args": ["threlte-mcp"]
  }
}
```

### 5. **Windsurf** (Codeium IDE)
Configuration file: `~/.windsurf/mcp_config.json`

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

### 6. **Continue** (VS Code Extension)
Configuration file: `~/.continue/config.json`

```json
{
  "mcpServers": [
    {
      "name": "threlte",
      "command": "npx",
      "args": ["threlte-mcp"]
    }
  ]
}
```

### 7. **Zed Editor**
Configuration: Coming soon (MCP support planned)

### 8. **VS Code Copilot**
Configuration: Built-in MCP support expected in future updates

## 🔧 Advanced Configurations

### Using Local Installation

If you've installed globally:
```bash
npm install -g threlte-mcp
```

Then you can use direct path:
```json
{
  "threlte": {
    "command": "threlte-mcp"
  }
}
```

### Using with Specific Node Version

```json
{
  "threlte": {
    "command": "/usr/local/bin/node",
    "args": [
      "--import",
      "file:///path/to/node_modules/tsx/dist/esm/index.mjs",
      "/path/to/threlte-mcp/dist/index.js"
    ]
  }
}
```

### Project-Specific Configuration

Place `mcp_config.json` in your project root:
```json
{
  "mcpServers": {
    "threlte": {
      "command": "npx",
      "args": ["threlte-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

## 🧪 Testing Compatibility

### Verify Installation
```bash
npx threlte-mcp --version
```

### Test Server Startup
```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | npx threlte-mcp
```

Should return a list of available tools.

## 🐛 Troubleshooting

### Server Not Connecting
1. **Check Node version**: Requires Node 18+
   ```bash
   node --version
   ```

2. **Verify package installation**:
   ```bash
   npm list -g threlte-mcp
   ```

3. **Check logs**: Most IDEs log MCP server output to:
   - Claude Desktop: `~/Library/Logs/Claude/mcp*.log`
   - Antigravity: `~/.gemini/antigravity/logs/`
   - VS Code extensions: Output panel

### WebSocket Connection Failed
Ensure your Threlte app has the MCPBridge component running and connected to `ws://localhost:8082`.

### Permission Issues
On Unix systems, make the bin file executable:
```bash
chmod +x node_modules/threlte-mcp/dist/index.js
```

## 📊 Compatibility Matrix

| IDE/Tool | Status | Config Location | Notes |
|----------|--------|-----------------|-------|
| Claude Desktop | ✅ Verified | `~/Library/Application Support/Claude/` | Official MCP support |
| Antigravity | ✅ Verified | `~/.gemini/antigravity/` | Project-level preferred |
| Claude Code | ✅ Verified | `~/.config/claude-code/` | CLI tool |
| Cursor | ✅ Compatible | Settings → MCP | VSCode-based |
| Windsurf | ✅ Compatible | `~/.windsurf/` | Codeium IDE |
| Continue | ✅ Compatible | `~/.continue/` | VS Code extension |
| Zed | 🔄 Planned | TBD | MCP support coming |
| GitHub Copilot | 🔄 Planned | TBD | MCP support expected |

## 🔗 Resources

- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [MCP SDK on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Claude Desktop MCP Guide](https://claude.ai/docs/mcp)
- [Antigravity MCP Documentation](https://antigravity.google/docs/mcp)

## 💡 Need Help?

- **Issues**: [GitHub Issues](https://github.com/RaulContreras123/threlte-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/RaulContreras123/threlte-mcp/discussions)
- **Discord**: [Threlte Discord](https://discord.gg/threlte) - #mcp channel
