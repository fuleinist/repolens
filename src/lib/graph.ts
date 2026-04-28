import { GitHubTreeItem, GraphNode, GraphEdge, RepoGraph } from '@/types';

// Language / file type categories
const EXT_CATEGORY: Record<string, string> = {
  ts: 'ts', tsx: 'ts', js: 'js', jsx: 'js',
  py: 'py', go: 'go', rs: 'rs', java: 'java',
  json: 'config', yaml: 'config', yml: 'config',
  toml: 'config', css: 'css', scss: 'css', less: 'css',
  html: 'html', svg: 'svg', md: 'md', sh: 'sh',
};

function getCategory(ext: string): string {
  return EXT_CATEGORY[ext] ?? 'other';
}

// Regex patterns for import/require/dependency detection per language
const IMPORT_PATTERNS: Array<{ lang: string; pattern: RegExp }> = [
  // TypeScript / JavaScript
  { lang: 'ts', pattern: /import\s+.*?from\s+['"]([^'"]+)['"]/g },
  { lang: 'ts', pattern: /import\s*\(['"]([^'"]+)['"]\)/g },
  { lang: 'ts', pattern: /require\s*\(['"]([^'"]+)['"]\)/g },
  { lang: 'ts', pattern: /export\s+.*?from\s+['"]([^'"]+)['"]/g },
  { lang: 'ts', pattern: /from\s+['"]([^'"]+)['"]/g },
  // Python
  { lang: 'py', pattern: /^import\s+(\S+)/gm },
  { lang: 'py', pattern: /^from\s+(\S+)\s+import/gm },
  // Go
  { lang: 'go', pattern: /import\s+"?(\S+)"?/g },
  { lang: 'go', pattern: /"?github\.com\/([^"\s]+)/g },
  // Rust
  { lang: 'rs', pattern: /use\s+([A-Za-z0-9_:]+)/g },
];

function detectImports(content: string, ext: string): Set<string> {
  const deps = new Set<string>();
  const lang = getCategory(ext);

  for (const { pattern } of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(content)) !== null) {
      deps.add(m[1]);
    }
  }

  return deps;
}

function resolveEdge(
  target: string,
  nodeMap: Map<string, GraphNode>,
  edges: GraphEdge[]
): void {
  // Try exact match first
  if (nodeMap.has(target)) {
    edges.push({ source: target, target: '' }); // filled later
    return;
  }

  // Try adding common extensions
  const candidates = [
    target + '.ts',
    target + '.tsx',
    target + '.js',
    target + '.jsx',
    target + '/index.ts',
    target + '/index.tsx',
    target + '/index.js',
  ];

  for (const c of candidates) {
    if (nodeMap.has(c)) {
      edges.push({ source: c, target: '' });
      return;
    }
  }
}

export function buildGraph(
  items: GitHubTreeItem[],
  fetchFile: (path: string) => Promise<string>
): { graph: RepoGraph; fetchFile: (path: string) => Promise<string> } {
  const MAX_FILES = 300;
  const nodeMap = new Map<string, GraphNode>();
  const rawEdges: Array<{ source: string; target: string }> = [];

  // Filter to supported source files
  const files = items.filter((item) => {
    const ext = (item.path.split('.').pop() ?? '').toLowerCase();
    return getCategory(ext) !== 'other' || ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs'].includes(ext);
  }).slice(0, MAX_FILES);

  // Create nodes
  for (const item of files) {
    const parts = item.path.split('/');
    const name = parts[parts.length - 1];
    const ext = (name.split('.').pop() ?? '').toLowerCase();
    nodeMap.set(item.path, {
      id: item.path,
      label: name,
      path: item.path,
      ext,
      size: Math.max(1, (item.size ?? 0) / 40), // rough line count estimate
    });
  }

  // Fetch content and detect edges (batched)
  const nodeArr = Array.from(nodeMap.values());

  // We'll do lazy edge detection — fetch content only for relevant files
  // For v1: just show structure without edges (edges added async)

  const graph: RepoGraph = { nodes: nodeArr, edges: rawEdges as unknown as GraphEdge[] };

  return { graph, fetchFile };
}

export async function enrichEdges(
  graph: RepoGraph,
  fetchFile: (path: string) => Promise<string>
): Promise<GraphEdge[]> {
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>(graph.nodes.map((n) => [n.id, n]));

  const sourceFiles = graph.nodes.filter((n) =>
    ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs'].includes(n.ext)
  );

  // Batch fetch to avoid hammering the API
  const BATCH = 5;
  for (let i = 0; i < sourceFiles.length; i += BATCH) {
    const batch = sourceFiles.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map((n) => fetchFile(n.path)));

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status !== 'fulfilled') continue;

      const content = result.value;
      const node = batch[j];
      const imports = detectImports(content, node.ext);

      for (const imp of imports) {
        // Normalize relative paths
        let targetPath = imp;
        if (imp.startsWith('.')) {
          // Resolve relative to node's directory
          const dir = node.path.split('/').slice(0, -1).join('/');
          targetPath = resolveRelative(dir, imp);
        }

        // Match against node map
        if (nodeMap.has(targetPath)) {
          edges.push({ source: node.id, target: targetPath });
        }
      }
    }
  }

  return edges;
}

function resolveRelative(dir: string, rel: string): string {
  const parts = [...dir.split('/'), ...rel.split('/')];
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === '..') resolved.pop();
    else if (p !== '.') resolved.push(p);
  }
  return resolved.join('/');
}

export function getNodeColor(ext: string): string {
  switch (getCategory(ext)) {
    case 'ts': return '#3178c6';
    case 'js': return '#f7df1e';
    case 'py': return '#3572A5';
    case 'go': return '#00ADD8';
    case 'rs': return '#dea584';
    case 'config': return '#4caf50';
    case 'css': return '#563d7c';
    default: return '#888';
  }
}

export function getNodeRadius(size: number): number {
  return Math.max(4, Math.min(20, 4 + Math.sqrt(size) * 0.5));
}
