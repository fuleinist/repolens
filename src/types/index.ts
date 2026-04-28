export interface GraphNode {
  id: string;
  label: string;
  path: string;
  ext: string;
  size: number; // line count
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface RepoGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

export interface ParsedRepo {
  owner: string;
  repo: string;
  defaultBranch: string;
  tree: GitHubTreeItem[];
}
