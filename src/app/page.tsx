'use client';

import { useState, useCallback, useRef } from 'react';
import RepoGraph from '@/components/RepoGraph';
import FileTree from '@/components/FileTree';
import StatsPanel from '@/components/StatsPanel';
import { fetchRepo } from '@/lib/github';
import { GraphNode, GraphEdge } from '@/types';

type ViewState = 'idle' | 'loading' | 'graph' | 'error';

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [owner, setOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [branch, setBranch] = useState('');
  const [lastInput, setLastInput] = useState('');

  const fetchFileRef = useRef<(path: string) => Promise<string>>(() => Promise.resolve(''));

  const handleAnalyze = useCallback(async () => {
    const input = inputValue.trim();
    if (!input) return;

    setViewState('loading');
    setErrorMsg('');
    setProgress(10);

    try {
      setProgress(30);
      const parsed = await fetchRepo(input);
      setOwner(parsed.owner);
      setRepoName(parsed.repo);
      setBranch(parsed.defaultBranch);
      setLastInput(input);

      setProgress(50);

      // Build initial graph (no edges yet)
      const { nodes: initNodes } = buildGraph(parsed.tree);

      // Create fetchFile closure
      fetchFileRef.current = async (path: string) => {
        try {
          const res = await fetch(
            `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.defaultBranch}/${path}`
          );
          if (!res.ok) return '';
          return res.text();
        } catch {
          return '';
        }
      };

      setNodes(initNodes);
      setEdges([]);
      setProgress(70);
      setViewState('graph');

      // Enrich edges in background (limit source files for speed)
      const sourceNodes = initNodes
        .filter((n) => ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs'].includes(n.ext))
        .slice(0, 100);
      const enrichedEdges = await enrichEdges(sourceNodes, fetchFileRef.current);
      setEdges(enrichedEdges);
      setProgress(100);
    } catch (err: unknown) {
      setViewState('error');
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
    }
  }, [inputValue]);

  return (
    <div className="min-h-screen bg-[#010409] text-[#c9d1d9] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#30363d] px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" fill="#58a6ff"/>
            <circle cx="5" cy="8" r="2" fill="#0969da" opacity="0.7"/>
            <circle cx="19" cy="8" r="2" fill="#0969da" opacity="0.7"/>
            <circle cx="7" cy="18" r="2" fill="#0969da" opacity="0.7"/>
            <circle cx="17" cy="18" r="2" fill="#0969da" opacity="0.7"/>
            <line x1="12" y1="9" x2="5" y2="8" stroke="#30363d" strokeWidth="1"/>
            <line x1="12" y1="9" x2="19" y2="8" stroke="#30363d" strokeWidth="1"/>
            <line x1="12" y1="15" x2="7" y2="18" stroke="#30363d" strokeWidth="1"/>
            <line x1="12" y1="15" x2="17" y2="18" stroke="#30363d" strokeWidth="1"/>
          </svg>
          <span className="font-bold text-lg tracking-tight text-white">RepoLens</span>
        </div>
        <span className="text-[#8b949e] text-xs hidden sm:inline">Understand any repo at a glance</span>
      </header>

      {/* Input bar */}
      <div className="border-b border-[#30363d] px-4 py-3 flex gap-2 shrink-0">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          placeholder="e.g. facebook/react or https://github.com/facebook/react"
          className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm font-mono text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-colors"
          disabled={viewState === 'loading'}
        />
        <button
          onClick={handleAnalyze}
          disabled={viewState === 'loading' || !inputValue.trim()}
          className="bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shrink-0"
        >
          {viewState === 'loading' ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {/* Progress bar */}
      {viewState === 'loading' && (
        <div className="w-full h-0.5 bg-[#21262d]">
          <div
            className="h-full bg-[#58a6ff] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error state */}
      {viewState === 'error' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md text-center">
            <div className="text-4xl mb-4">⚠</div>
            <div className="text-[#f85149] font-medium mb-2">Analysis failed</div>
            <div className="text-[#8b949e] text-sm">{errorMsg}</div>
            <button
              onClick={() => setViewState('idle')}
              className="mt-4 text-sm text-[#58a6ff] hover:underline"
            >
              Try another repo
            </button>
          </div>
        </div>
      )}

      {/* Idle state */}
      {viewState === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Paste any GitHub repo URL</h2>
            <p className="text-[#8b949e] text-sm max-w-sm">
              RepoLens fetches the codebase, parses import relationships, and renders an interactive knowledge graph.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full">
            {['facebook/react', 'vercel/next.js', 'microsoft/vscode'].map((example) => (
              <button
                key={example}
                onClick={() => setInputValue(example)}
                className="bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff] rounded-md px-3 py-2 text-xs font-mono text-[#8b949e] hover:text-[#c9d1d9] text-left transition-colors truncate"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Graph view */}
      {viewState === 'graph' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside className="w-56 border-r border-[#30363d] flex flex-col shrink-0 overflow-hidden">
            {/* Repo info */}
            <div className="px-3 py-2 border-b border-[#30363d] text-xs">
              <div className="font-mono text-[#c9d1d9] truncate">{owner}/{repoName}</div>
              <div className="text-[#8b949e] text-[10px]">branch: {branch}</div>
            </div>

            {/* File tree */}
            <div className="flex-1 overflow-hidden">
              <div className="text-[10px] uppercase tracking-wider text-[#8b949e] px-3 py-1.5 border-b border-[#21262d]">
                Files
              </div>
              <div className="h-[calc(100%-32px)]">
                <FileTree nodes={nodes} owner={owner} repo={repoName} branch={branch} />
              </div>
            </div>
          </aside>

          {/* Main graph area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-2 border-b border-[#30363d] text-xs shrink-0">
              <span className="text-[#8b949e]">
                <span className="text-[#c9d1d9] font-medium">{nodes.length}</span> files
              </span>
              <span className="text-[#8b949e]">
                <span className="text-[#c9d1d9] font-medium">{edges.length}</span> connections
              </span>
              <span className="text-[#484f58]">·</span>
              <span className="text-[#484f58] text-[10px]">Drag nodes · Scroll to zoom · Pan to navigate</span>
              <button
                onClick={() => {
                  if (lastInput) {
                    setInputValue(lastInput);
                    setViewState('idle');
                    setTimeout(() => handleAnalyze(), 0);
                  }
                }}
                className="text-[#58a6ff] hover:underline"
              >
                ↻ Re-analyze
              </button>
              <button
                onClick={() => setViewState('idle')}
                className="text-[#58a6ff] hover:underline"
              >
                New analysis
              </button>
            </div>

            {/* Graph canvas */}
            <div className="flex-1 relative">
              <RepoGraph
                nodes={nodes}
                edges={edges}
                owner={owner}
                repo={repoName}
                branch={branch}
              />

              {/* Stats overlay */}
              {nodes.length > 0 && (
                <div className="absolute bottom-3 right-3 w-52 bg-[#161b22]/95 border border-[#30363d] rounded-lg px-3 py-2">
                  <StatsPanel nodes={nodes} edges={edges} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildGraph(
  tree: Array<{ path: string; size?: number; type: string }>
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const SUPPORTED_EXTS = new Set([
    'ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java',
    'json', 'yaml', 'yml', 'toml', 'css', 'scss', 'less',
    'html', 'svg', 'md', 'sh',
  ]);

  const nodes: GraphNode[] = tree
    .filter((item) => {
      const ext = (item.path.split('.').pop() ?? '').toLowerCase();
      return SUPPORTED_EXTS.has(ext);
    })
    .slice(0, 300)
    .map((item) => {
      const parts = item.path.split('/');
      const name = parts[parts.length - 1];
      const ext = (name.split('.').pop() ?? '').toLowerCase();
      return {
        id: item.path,
        label: name,
        path: item.path,
        ext,
        size: Math.max(1, Math.round((item.size ?? 0) / 40)),
      };
    });

  return { nodes, edges: [] };
}

// Import patterns per language
const RE_TS_IMPORT = /\b(?:import\s+(?:(?:\{[^}]+\}|\w+\s*,\s*)*)\s*from\s+['"]([^'"]+)['"]|import\s*\(['"]([^'"]+)['"]\)|require\s*\(['"]([^'"]+)['"]\)|export\s+(?:\{[^}]+\}|\*\s*as\s*\w+|\w+)\s+from\s+['"]([^'"]+)['"])/g;
const RE_PY_IMPORT = /(?:^from\s+([\w.]+)\s+import|^import\s+([\w.]+))/gm;
const RE_GO_IMPORT = /import\s+"?(\/.+?)"?/g;
const RE_RS_IMPORT = /\buse\s+([\w:]+)(?:::[^;]+)?(?:;\s*as\s+\w+)?;/g;

async function enrichEdges(
  nodes: GraphNode[],
  fetchFile: (path: string) => Promise<string>
): Promise<GraphEdge[]> {
  const edges: GraphEdge[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const sourceFiles = nodes.filter((n) =>
    ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs'].includes(n.ext)
  );

  const BATCH = 10;
  for (let i = 0; i < sourceFiles.length; i += BATCH) {
    const batch = sourceFiles.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map((n) => fetchFile(n.path)));

    for (let j = 0; j < results.length; j++) {
      if (results[j].status !== 'fulfilled') continue;
      const content = (results[j] as PromiseFulfilledResult<string>).value;
      const node = batch[j];
      const seen = new Set<string>();
      const ext = node.ext;

      if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
        RE_TS_IMPORT.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = RE_TS_IMPORT.exec(content)) !== null) {
          const dep = (m[1] || m[2] || m[3] || m[4] || '').trim().split('?')[0].split('#')[0];
          if (!dep || dep.startsWith('http') || dep.startsWith('/')) continue;
          addEdgeTS(dep, node.path, seen, edges, nodeMap);
        }
      } else if (ext === 'py') {
        RE_PY_IMPORT.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = RE_PY_IMPORT.exec(content)) !== null) {
          const dep = (m[1] || m[2] || '').trim();
          if (!dep) continue;
          addEdgePy(dep, node.path, seen, edges, nodeMap);
        }
      } else if (ext === 'go') {
        RE_GO_IMPORT.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = RE_GO_IMPORT.exec(content)) !== null) {
          const dep = (m[1] || '').trim().replace(/^"/, '').replace(/"$/, '');
          if (!dep) continue;
          addEdgeGo(dep, node.path, seen, edges, nodeMap);
        }
      } else if (ext === 'rs') {
        RE_RS_IMPORT.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = RE_RS_IMPORT.exec(content)) !== null) {
          const dep = (m[1] || '').trim();
          if (!dep) continue;
          addEdgeRs(dep, node.path, seen, edges, nodeMap);
        }
      }
    }
  }

  return edges;
}

function addEdgeTS(dep: string, srcPath: string, seen: Set<string>, edges: GraphEdge[], nodeMap: Map<string, GraphNode>) {
  if (!dep) return;
  if (dep.startsWith('.')) {
    const dir = srcPath.split('/').slice(0, -1).join('/');
    dep = resolveRelative(dir, dep);
  }
  if (nodeMap.has(dep) && !seen.has(dep)) { seen.add(dep); edges.push({ source: srcPath, target: dep }); return; }
  for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx']) {
    const cand = dep + ext;
    if (nodeMap.has(cand) && !seen.has(cand)) { seen.add(cand); edges.push({ source: srcPath, target: cand }); return; }
  }
}

function addEdgePy(dep: string, srcPath: string, seen: Set<string>, edges: GraphEdge[], nodeMap: Map<string, GraphNode>) {
  if (!dep) return;
  const filePath = dep.split('.').join('/') + '.py';
  if (nodeMap.has(filePath) && !seen.has(filePath)) { seen.add(filePath); edges.push({ source: srcPath, target: filePath }); return; }
  const pkgPath = dep.split('.').join('/') + '/__init__.py';
  if (nodeMap.has(pkgPath) && !seen.has(pkgPath)) { seen.add(pkgPath); edges.push({ source: srcPath, target: pkgPath }); }
}

function addEdgeGo(dep: string, srcPath: string, seen: Set<string>, edges: GraphEdge[], nodeMap: Map<string, GraphNode>) {
  if (!dep) return;
  const goPath = dep + '.go';
  if (nodeMap.has(goPath) && !seen.has(goPath)) { seen.add(goPath); edges.push({ source: srcPath, target: goPath }); }
}

function addEdgeRs(dep: string, srcPath: string, seen: Set<string>, edges: GraphEdge[], nodeMap: Map<string, GraphNode>) {
  if (!dep) return;
  const rsPath = dep.split('::').join('/') + '.rs';
  if (nodeMap.has(rsPath) && !seen.has(rsPath)) { seen.add(rsPath); edges.push({ source: srcPath, target: rsPath }); return; }
  const modPath = dep.split('::').join('/') + '/mod.rs';
  if (nodeMap.has(modPath) && !seen.has(modPath)) { seen.add(modPath); edges.push({ source: srcPath, target: modPath }); }
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
