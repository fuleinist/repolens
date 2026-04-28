'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphEdge } from '@/types';
import { getNodeColor, getNodeRadius } from '@/lib/graph';

interface RepoGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  owner?: string;
  repo?: string;
  branch?: string;
}

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}

export default function RepoGraph({ nodes, edges, owner, repo, branch }: RepoGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ node: GraphNode; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current).attr('width', cw).attr('height', ch);
    svg.append('rect').attr('width', cw).attr('height', ch).attr('fill', '#0d1117');

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 5])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Arrow marker
    svg.select('defs').remove();
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .append('path')
      .attr('d', 'M 0,-4 L 8,0 L 0,4')
      .attr('fill', '#30363d');

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const simEdges = edges
      .filter((e) => {
        const src = typeof e.source === 'string' ? e.source : e.source.id;
        const tgt = typeof e.target === 'string' ? e.target : e.target.id;
        return nodeById.has(src) && nodeById.has(tgt) && src !== tgt;
      })
      .map((e) => ({
        source: typeof e.source === 'string' ? e.source : e.source.id,
        target: typeof e.target === 'string' ? e.target : e.target.id,
      }));

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force('link', d3.forceLink<SimNode, typeof simEdges[0]>(simEdges).id((d) => d.id).distance(50).strength(0.2))
      .force('charge', d3.forceManyBody().strength(-80))
      .force('center', d3.forceCenter(cw / 2, ch / 2))
      .force('collision', d3.forceCollide<SimNode>().radius((d) => getNodeRadius(d.size) + 3));

    const link = g.append('g').selectAll('line')
      .data(simEdges).join('line')
      .attr('stroke', '#30363d').attr('stroke-width', 1).attr('stroke-opacity', 0.5)
      .attr('marker-end', 'url(#arrowhead)');

    const nodeG = g.append('g').selectAll<SVGGElement, SimNode>('g')
      .data(simNodes).join('g').style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    nodeG.append('circle')
      .attr('r', (d) => getNodeRadius(d.size))
      .attr('fill', (d) => getNodeColor(d.ext))
      .attr('fill-opacity', 0.85)
      .attr('stroke', (d) => getNodeColor(d.ext))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.5);

    nodeG.append('text')
      .text((d) => d.label.length > 16 ? d.label.slice(0, 14) + '…' : d.label)
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('fill', '#8b949e')
      .attr('dx', (d) => getNodeRadius(d.size) + 3)
      .attr('dy', '0.35em')
      .attr('pointer-events', 'none');

    nodeG
      .on('mouseenter', (event, d) => {
        setTooltip({ node: d, x: event.clientX, y: event.clientY });
        d3.select(event.currentTarget).select('circle').attr('fill-opacity', 1).attr('stroke-width', 2.5);
      })
      .on('mousemove', (event) => setTooltip({ node: tooltip?.node ?? (event.currentTarget as any).__data__, x: event.clientX, y: event.clientY }))
      .on('mouseleave', (event) => {
        setTooltip(null);
        d3.select(event.currentTarget).select('circle').attr('fill-opacity', 0.85).attr('stroke-width', 1.5);
      })
      .on('click', (_, d) => {
        if (owner && repo && branch) {
          window.open(`https://github.com/${owner}/${repo}/blob/${branch}/${d.path}`, '_blank');
        }
      });

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as unknown as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as unknown as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as unknown as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as unknown as SimNode).y ?? 0);
      nodeG.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [nodes, edges, owner, repo, branch]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0d1117] rounded-lg overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-[#161b22] border border-[#30363d] rounded px-3 py-2 shadow-xl max-w-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <div className="font-mono text-[#c9d1d9] text-xs font-medium truncate">{tooltip.node.label}</div>
          <div className="text-[#8b949e] text-[10px] mt-0.5 break-all">{tooltip.node.path}</div>
          <div className="text-[#58a6ff] text-[10px] mt-1">~{Math.round(tooltip.node.size)} lines · {tooltip.node.ext.toUpperCase()}</div>
          {owner && repo && <div className="text-[#8b949e] text-[10px]">Click to open on GitHub</div>}
        </div>
      )}
    </div>
  );
}
