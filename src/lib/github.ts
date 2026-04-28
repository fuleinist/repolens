import { GitHubTreeItem, ParsedRepo } from '@/types';

function parseRepoInput(input: string): { owner: string; repo: string } {
  input = input.trim();
  // Already full URL
  const urlMatch = input.match(/github\.com\/([^/]+)\/([^/\s]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
  }
  // owner/repo shorthand
  const parts = input.split('/');
  if (parts.length === 2) {
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  }
  throw new Error('Invalid repo format. Use owner/repo or a GitHub URL.');
}

async function fetchDefaultBranch(owner: string, repo: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Repository not found.');
    if (res.status === 403) throw new Error('API rate limit exceeded. Try again later.');
    throw new Error(`GitHub API error: ${res.status}`);
  }
  const data = await res.json();
  return data.default_branch ?? 'main';
}

async function fetchTreeRecursive(
  owner: string,
  repo: string,
  branch: string,
  onProgress?: (count: number) => void
): Promise<GitHubTreeItem[]> {
  const items: GitHubTreeItem[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1&per_page=${perPage}&page=${page}`,
      {
        headers: { Accept: 'application/vnd.github.v3+json' },
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch repo tree: ${res.status}`);
    }
    const data = await res.json();

    // GitHub truncates large trees with a `truncated: true` flag
    for (const item of data.tree as GitHubTreeItem[]) {
      if (item.type === 'blob') {
        items.push(item);
        if (onProgress) onProgress(items.length);
      }
    }

    if (data.truncated) {
      // Still useful — partial tree
      break;
    }

    // GitHub returns a single page for small trees
    if (!data.truncated && page === 1 && data.tree.length < perPage) {
      break;
    }

    if (items.length >= (data.truncated ? items.length : data.tree.length)) break;
    page++;
  }

  return items;
}

export async function fetchRepo(input: string): Promise<ParsedRepo> {
  const { owner, repo } = parseRepoInput(input);
  const branch = await fetchDefaultBranch(owner, repo);
  const tree = await fetchTreeRecursive(owner, repo, branch);
  return { owner, repo, defaultBranch: branch, tree };
}
