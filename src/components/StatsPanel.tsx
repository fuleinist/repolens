'use client';

import { GraphNode, GraphEdge } from '@/types';
import { getNodeColor } from '@/lib/graph';

interface StatsPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function StatsPanel({ nodes, edges }: StatsPanelProps) {
  const totalLines = nodes.reduce((s, n) => s + n.size, 0);

  // Language breakdown
  const langCount: Record<string, number> = {};
  for (const n of nodes) {
    langCount[n.ext] = (langCount[n.ext] ?? 0) + 1;
  }
  const langSorted = Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Most connected files
  const connectionCount: Record<string, number> = {};
  for (const e of edges) {
    const src = typeof e.source === 'string' ? e.source : e.source.id;
    const tgt = typeof e.target === 'string' ? e.target : e.target.id;
    connectionCount[src] = (connectionCount[src] ?? 0) + 1;
    connectionCount[tgt] = (connectionCount[tgt] ?? 0) + 1;
  }
  const topHubs = Object.entries(connectionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ node: nodes.find((n) => n.id === id), count }))
    .filter((h) => h.node);

  return (
    <div className="space-y-4 text-xs font-mono">
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="Files" value={nodes.length} />
        <StatBox label="Edges" value={edges.length} />
        <StatBox label="Lines (est.)" value={totalLines} />
        <StatBox label="Languages" value={langSorted.length} />
      </div>

      {langSorted.length > 0 && (
        <div>
          <div className="text-[#8b949e] uppercase tracking-wider text-[10px] mb-2">Languages</div>
          <div className="space-y-1">
            {langSorted.map(([ext, count]) => (
              <div key={ext} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getNodeColor(ext) }}
                />
                <span className="text-[#c9d1d9] flex-1 truncate">.{ext}</span>
                <span className="text-[#8b949e]">{count}</span>
                <div className="w-16 h-1 bg-[#21262d] rounded overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${(count / nodes.length) * 100}%`,
                      backgroundColor: getNodeColor(ext),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topHubs.length > 0 && (
        <div>
          <div className="text-[#8b949e] uppercase tracking-wider text-[10px] mb-2">Top Hubs</div>
          <div className="space-y-1">
            {topHubs.map(({ node, count }) => (
              <div key={node!.id} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getNodeColor(node!.ext) }}
                />
                <span className="text-[#c9d1d9] flex-1 truncate" title={node!.path}>
                  {node!.label}
                </span>
                <span className="text-[#58a6ff]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded px-3 py-2">
      <div className="text-[#8b949e] text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-[#c9d1d9] text-lg font-semibold mt-0.5">
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </div>
    </div>
  );
}
