/// <reference types="vitest/globals" />
/**
 * Endpoint coverage test
 *
 * Scans frontend files for fetch('/api/...') calls and verifies
 * that each has a corresponding backend route.ts with the correct HTTP method.
 *
 * Catches 405 (Method Not Allowed) issues like the missing POST /api/admin/create-user.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');

// ==================== HELPERS ====================

/** Recursively find files matching a pattern */
function findFiles(dir: string, ext: string[], exclude: string[] = []): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (exclude.some((ex) => fullPath.includes(ex))) continue;
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, ext, exclude));
    } else if (ext.some((e) => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Extract API URL pattern from route.ts file path */
function routeFileToApiPath(filePath: string): string {
  const rel = path.relative(path.join(ROOT, 'app'), filePath).replace(/\\/g, '/');
  // Remove /route.ts suffix → api/admin/users/[id]/verify
  return '/' + rel.replace('/route.ts', '');
}

/** Extract exported HTTP methods from a route.ts file */
function extractRouteMethods(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const methods: string[] = [];
  const regex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  return methods;
}

interface FetchCall {
  url: string; // normalized pattern, e.g. /api/items/[id]/book
  method: string; // GET, POST, etc.
  file: string; // source file
  line: number;
}

/** Normalize a fetch URL by replacing dynamic segments with [id]/[bookingId] */
function normalizeUrl(raw: string): string {
  // Remove query strings
  let url = raw.split('?')[0];

  // Replace template literal expressions like ${...} with [id]
  url = url.replace(/\$\{[^}]+\}/g, '[id]');

  // Trim trailing slashes
  url = url.replace(/\/+$/, '');

  return url;
}

/** Extract fetch calls from a frontend file */
function extractFetchCalls(filePath: string): FetchCall[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: FetchCall[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match fetch( with URL containing /api/
    // Patterns:
    //   fetch('/api/items')
    //   fetch(`/api/items/${id}`)
    //   fetch(`/api/items/${id}/book`, { method: 'POST' ... })
    //   fetch(url, ...) where url is `/api/...` defined elsewhere

    const fetchMatch = line.match(/fetch\(\s*[`'"]([^`'"]*\/api\/[^`'"]*)[`'"]/);
    if (!fetchMatch) continue;

    const rawUrl = fetchMatch[1];
    const url = normalizeUrl(rawUrl);

    // Find method: check current line and next few lines for method:
    let method = 'GET'; // default
    const context = lines.slice(i, Math.min(i + 8, lines.length)).join(' ');
    const methodMatch = context.match(/method:\s*[`'"](GET|POST|PUT|PATCH|DELETE)[`'"]/i);
    if (methodMatch) {
      method = methodMatch[1].toUpperCase();
    }

    // Also check for ternary method patterns like:
    //   method: isBecomingOwner ? 'POST' : 'PATCH'
    if (!methodMatch) {
      const ternaryMatch = context.match(/method:\s*\w+\s*\?\s*['"](\w+)['"]\s*:\s*['"](\w+)['"]/);
      if (ternaryMatch) {
        // Add both variants
        results.push({ url, method: ternaryMatch[1].toUpperCase(), file: filePath, line: i + 1 });
        results.push({ url, method: ternaryMatch[2].toUpperCase(), file: filePath, line: i + 1 });
        continue;
      }
    }

    results.push({ url, method, file: filePath, line: i + 1 });
  }

  return results;
}

// Also handle patterns where URL is constructed in a variable before fetch
function extractFetchCallsAdvanced(filePath: string): FetchCall[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: FetchCall[] = [];

  // Find fetch calls with variable URLs that reference /api/
  // e.g.: const url = isX ? '/api/profile/become-owner' : '/api/profile';
  //        fetch(url, ...)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern: fetch(variableName ? '/api/...' : '/api/...', ...)
    const conditionalFetch = line.match(/fetch\(\s*\w+\s*\?\s*['"`]([^'"`]*\/api\/[^'"`]*)['"`]\s*:\s*['"`]([^'"`]*\/api\/[^'"`]*)['"`]/);
    if (conditionalFetch) {
      const context = lines.slice(i, Math.min(i + 8, lines.length)).join(' ');

      // Try to find method for each branch
      const ternaryMethod = context.match(/method:\s*\w+\s*\?\s*['"](\w+)['"]\s*:\s*['"](\w+)['"]/);

      const url1 = normalizeUrl(conditionalFetch[1]);
      const url2 = normalizeUrl(conditionalFetch[2]);

      if (ternaryMethod) {
        results.push({ url: url1, method: ternaryMethod[1].toUpperCase(), file: filePath, line: i + 1 });
        results.push({ url: url2, method: ternaryMethod[2].toUpperCase(), file: filePath, line: i + 1 });
      } else {
        const methodMatch = context.match(/method:\s*['"](\w+)['"]/);
        const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
        results.push({ url: url1, method, file: filePath, line: i + 1 });
        results.push({ url: url2, method, file: filePath, line: i + 1 });
      }
    }
  }

  return results;
}

// ==================== COLLECT DATA ====================

/** Build map of all backend routes: { "/api/items/[id]": ["GET", "PATCH", "DELETE"] } */
function collectBackendRoutes(): Map<string, string[]> {
  const routeFiles = findFiles(path.join(ROOT, 'app', 'api'), ['.ts'], ['node_modules']);
  const routes = new Map<string, string[]>();

  for (const file of routeFiles) {
    if (!file.endsWith('route.ts')) continue;
    const apiPath = routeFileToApiPath(file);
    const methods = extractRouteMethods(file);
    if (methods.length > 0) {
      routes.set(apiPath, methods);
    }
  }

  return routes;
}

/** Collect all fetch calls from frontend files */
function collectFrontendCalls(): FetchCall[] {
  const frontendDirs = [
    path.join(ROOT, 'components'),
    path.join(ROOT, 'hooks'),
  ];

  const exclude = [
    path.join(ROOT, 'app', 'api'),
    'node_modules',
    '__tests__',
  ];

  let files: string[] = [];
  for (const dir of frontendDirs) {
    files.push(...findFiles(dir, ['.ts', '.tsx'], exclude));
  }
  // Also add app-level pages (excluding api routes)
  const appFiles = findFiles(path.join(ROOT, 'app'), ['.tsx', '.ts'], [
    ...exclude,
    path.join(ROOT, 'app', 'api'),
  ]);
  files.push(...appFiles);

  const calls: FetchCall[] = [];
  for (const file of files) {
    calls.push(...extractFetchCalls(file));
    calls.push(...extractFetchCallsAdvanced(file));
  }

  return calls;
}

/** Normalize route path for comparison: replace [bookingId] with [id] */
function normalizeRoutePath(p: string): string {
  return p.replace(/\[bookingId\]/g, '[id]');
}

// ==================== TESTS ====================

describe('Endpoint coverage: frontend ↔ backend', () => {
  const backendRoutes = collectBackendRoutes();
  const frontendCalls = collectFrontendCalls();

  // Deduplicate frontend calls by url+method
  const uniqueCalls = new Map<string, FetchCall>();
  for (const call of frontendCalls) {
    const key = `${call.method} ${call.url}`;
    if (!uniqueCalls.has(key)) {
      uniqueCalls.set(key, call);
    }
  }

  // Build normalized backend map
  const normalizedBackend = new Map<string, string[]>();
  for (const [route, methods] of backendRoutes) {
    normalizedBackend.set(normalizeRoutePath(route), methods);
  }

  it('should have backend routes discovered', () => {
    expect(backendRoutes.size).toBeGreaterThan(30);
  });

  it('should have frontend fetch calls discovered', () => {
    expect(uniqueCalls.size).toBeGreaterThan(20);
  });

  // Test each frontend call has a matching backend route + method
  for (const [key, call] of uniqueCalls) {
    const normalizedUrl = normalizeRoutePath(call.url);

    it(`${key} → route exists`, () => {
      const methods = normalizedBackend.get(normalizedUrl);
      const relFile = path.relative(ROOT, call.file).replace(/\\/g, '/');

      expect(
        methods,
        `No route.ts found for ${normalizedUrl} (called from ${relFile}:${call.line})`
      ).toBeDefined();

      expect(
        methods,
        `Route ${normalizedUrl} exists but does not export ${call.method} (has: ${methods?.join(', ')}). Called from ${relFile}:${call.line}`
      ).toContain(call.method);
    });
  }
});
