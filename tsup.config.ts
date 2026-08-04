import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    mcp: 'src/mcp.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  target: 'node22',
  shims: true,
  onSuccess: async () => {
    // Add shebang to CLI file after build
    const fs = await import('fs');
    const cliPath = './dist/cli.js';
    if (fs.existsSync(cliPath)) {
      const content = fs.readFileSync(cliPath, 'utf-8');
      if (!content.startsWith('#!/usr/bin/env node')) {
        fs.writeFileSync(cliPath, '#!/usr/bin/env node\n' + content);
      }
    }
    const cliMjsPath = './dist/cli.mjs';
    if (fs.existsSync(cliMjsPath)) {
      const content = fs.readFileSync(cliMjsPath, 'utf-8');
      if (!content.startsWith('#!/usr/bin/env node')) {
        fs.writeFileSync(cliMjsPath, '#!/usr/bin/env node\n' + content);
      }
    }
    // Add shebang to MCP server files
    for (const mcpPath of ['./dist/mcp.js', './dist/mcp.mjs']) {
      if (fs.existsSync(mcpPath)) {
        const content = fs.readFileSync(mcpPath, 'utf-8');
        if (!content.startsWith('#!/usr/bin/env node')) {
          fs.writeFileSync(mcpPath, '#!/usr/bin/env node\n' + content);
        }
      }
    }
  },
});
