# RepoLens

**Drop any GitHub repo URL — get an interactive knowledge graph in seconds.**

Understand any codebase at a glance. RepoLens fetches the repository, parses import/dependency relationships, and renders a force-directed knowledge graph showing how files connect.

![RepoLens](docs/demo.png)

## Features

- **Interactive Graph** — D3.js force simulation with drag, zoom, and pan
- **Import Edge Detection** — Shows actual code relationships (not just file proximity) for TS/TSX/JS/JSX, Python, Go, and Rust
- **File Tree Sidebar** — Collapsible directory tree synced with the graph
- **Stats Panel** — File counts, language breakdown, top hub files
- **Click-to-GitHub** — Click any node to open the file directly
- **Error Handling** — Graceful handling of invalid URLs, 404s, rate limits

## Tech

- Next.js 16 (App Router)
- D3.js for graph visualization
- GitHub REST API (no auth needed for public repos)
- Tailwind CSS (dark GitHub-inspired theme)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and paste any public GitHub repo URL.

## Usage

Paste any of these formats:
- `owner/repo` — e.g. `facebook/react`
- Full URL — e.g. `https://github.com/facebook/react`

The graph renders up to 300 files with import edges for source files.

## Limits (v1)

- Public repos only (no auth)
- Single branch (default branch)
- Max ~300 files per analysis
- Edge detection limited to TS/JS/Python/Go/Rust source files

## Deploy

```bash
npm run build
npm run start
```

Or deploy to Vercel with one click.

## License

MIT