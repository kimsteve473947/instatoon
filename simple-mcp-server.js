#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const fs = require('fs');
const path = require('path');

// 간단한 MCP 서버
class SimpleMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'instartoon-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // 도구 목록 반환
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'read_file',
          description: 'Read content from a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path to read' }
            },
            required: ['path']
          }
        },
        {
          name: 'write_file', 
          description: 'Write content to a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path to write' },
              content: { type: 'string', description: 'Content to write' }
            },
            required: ['path', 'content']
          }
        },
        {
          name: 'list_files',
          description: 'List files in a directory', 
          inputSchema: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Directory path' }
            },
            required: ['directory']
          }
        }
      ]
    }));

    // 도구 실행 핸들러
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'read_file':
            return this.readFile(args.path);
          
          case 'write_file':
            return this.writeFile(args.path, args.content);
          
          case 'list_files':
            return this.listFiles(args.directory);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }]
        };
      }
    });
  }

  async readFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      content: [{
        type: 'text',
        text: content
      }]
    };
  }

  async writeFile(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return {
      content: [{
        type: 'text', 
        text: `Successfully wrote to ${filePath}`
      }]
    };
  }

  async listFiles(directory) {
    const files = fs.readdirSync(directory);
    return {
      content: [{
        type: 'text',
        text: files.join('\\n')
      }]
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Server started successfully');
  }
}

// 서버 시작
if (require.main === module) {
  const server = new SimpleMCPServer();
  server.start().catch(console.error);
}

module.exports = SimpleMCPServer;