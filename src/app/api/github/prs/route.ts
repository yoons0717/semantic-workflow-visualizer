// GET /api/github/prs?repo=owner/repo — 해당 레포의 오픈 PR 목록 반환
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get('repo');

  if (!repo) {
    return Response.json({ error: 'repo param is required' }, { status: 400 });
  }

  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    return Response.json({ error: 'repo must be in owner/repo format' }, { status: 400 });
  }

  if (!process.env.GITHUB_TOKEN) {
    return Response.json({ error: 'GITHUB_TOKEN is not set' }, { status: 401 });
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  };

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/pulls?state=open&per_page=50`,
      { headers },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json({ error: (err as { message?: string }).message ?? 'Failed to fetch PRs' }, { status: res.status });
    }

    const data = await res.json() as Array<{ number: number; title: string }>;
    return Response.json(data.map(({ number, title }) => ({ number, title })));
  } catch (err) {
    console.error('[/api/github/prs]', err);
    return Response.json({ error: 'Failed to fetch GitHub PRs' }, { status: 500 });
  }
}
