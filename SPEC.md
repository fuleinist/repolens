# RepoLens — Spec

## What it does
Drop a GitHub repo URL → get an interactive force-directed knowledge graph of the codebase. Each node = a file/folder. Edges = import/dependency relationships. Click nodes to explore.

## Tech
- **Next.js 14** (App Router)
- **D3.js** for graph visualization
- **GitHub REST API** (no auth needed for public repos)
- **tree-sitter** via WASM for AST parsing (import detection)
- Deployed on **Vercel**

## Core features

### F1 — Repo Input
- Single text field: paste any public GitHub repo URL or `owner/repo` shorthand
- "Analyze" button → triggers fetch + parse + render
- Shows loading state with progress bar

### F2 — Knowledge Graph
- Force-directed graph (D3.js force simulation)
- **Nodes**: files (.ts/.tsx/.js/.jsx/.py/.go), sized by line count
- **Edges**: import/require/dependency relationships detected via tree-sitter
- **Colors**: 
  - Blue = TS/TSX
  - Yellow = JS/JSX  
  - Green = config (json, yaml, toml)
  - Gray = other
- Node labels: filename (truncated), shown on hover
- Zoom + pan + drag supported
- Click node → opens file on GitHub in new tab

### F3 — File Tree Sidebar
- Collapsible directory tree synced with graph
- Clicking a file highlights its node in the graph

### F4 — Stats Panel
- Total files, total edges
- Most-connected files (top hubs)
- Language breakdown (bar chart)

### F5 — Error Handling
- Invalid URL → inline error
- Private repo → "This repo is private. Provide a GitHub token?" (stretch)
- 404 / rate limit → user-friendly message

## Out of scope (v1)
- Local repo upload
- Authentication / private repos
- Multiple branches
- Code search within graph

## Acceptance criteria
- [ ] User can paste any public GitHub repo URL and see a graph within 10s
- [ ] Graph renders at least files and import edges
- [ ] Nodes are draggable, zoomable, pannable
- [ ] Clicking a node opens the file on GitHub
- [ ] File tree sidebar is present and synced
- [ ] Stats panel shows file/edge counts
- [ ] Graceful error for invalid/repo/404

## Design
- Dark theme (GitHub-inspired)
- Minimal — the graph IS the UI
- Font: JetBrains Mono for code elements
- Accent: GitHub blue (#0969da)
