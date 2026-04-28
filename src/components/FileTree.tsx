'use client';

import { useState } from 'react';
import { GraphNode } from '@/types';
import { getNodeColor } from '@/lib/graph';

interface FileTreeProps {
  nodes: GraphNode[];
  owner?: string;
  repo?: string;
  branch?: string;
  onSelect?: (node: GraphNode) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  node?: GraphNode;
}

function buildTree(nodes: GraphNode[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  for (const node of nodes) {
    const parts = node.path.split('/');
    let cur = root;
    let prefix = '';

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isDir = i < parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');
      prefix = path;

      let found = map.get(path);
      if (!found) {
        found = { name, path, isDir, children: [], node: !isDir ? node : undefined };
        map.set(path, found);
        cur.push(found);
      }
      cur = found.children;
    }
  }

  return root;
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((n) => ({ ...n, children: sortTree(n.children) }));
}

function TreeItem({
  node,
  depth,
  owner,
  repo,
  branch,
  onSelect,
  selectedPath,
}: {
  node: TreeNode;
  depth: number;
  owner?: string;
  repo?: string;
  branch?: string;
  onSelect?: (n: GraphNode) => void;
  selectedPath?: string;
}) {
  const [open, setOpen] = useState(depth < 2);

  const isSelected = selectedPath === node.path;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-0.5 text-xs cursor-pointer rounded transition-colors
          ${isSelected ? 'bg-[#1f6feb33] text-[#58a6ff]' : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9]'}`}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={() => {
          if (node.isDir) {
            setOpen(!open);
          } else if (node.node) {
            onSelect?.(node.node);
            if (owner && repo && branch) {
              window.open(`https://github.com/${owner}/${repo}/blob/${branch}/${node.path}`, '_blank');
            }
          }
        }}
      >
        {node.isDir && (
          <span className="text-[#8b949e] w-3 shrink-0 text-center">
            {open ? '▾' : '▸'}
          </span>
        )}
        {!node.isDir && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: node.node ? getNodeColor(node.node.ext) : '#888' }}
          />
        )}
        <span className="truncate font-mono">{node.name}</span>
      </div>
      {node.isDir && open && (
        <div>
          {sortTree(node.children).map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              owner={owner}
              repo={repo}
              branch={branch}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ nodes, owner, repo, branch, onSelect }: FileTreeProps) {
  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const tree = sortTree(buildTree(nodes));

  return (
    <div className="h-full overflow-y-auto py-1">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          owner={owner}
          repo={repo}
          branch={branch}
          onSelect={(n) => {
            setSelectedPath(n.path);
            onSelect?.(n);
          }}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}
