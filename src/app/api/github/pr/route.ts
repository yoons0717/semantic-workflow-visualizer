// GET /api/github/pr?repo=owner/repo&pr=123 — GitHub PR 제목·본문·diff 반환 (최대 12,000자 truncate)
const MAX_DIFF_CHARS = 12000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get('repo');
  const pr = searchParams.get('pr');

  if (!repo || !pr) {
    return Response.json({ error: 'repo and pr params are required' }, { status: 400 });
  }

  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    return Response.json({ error: 'repo must be in owner/repo format' }, { status: 400 });
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const [prRes, filesRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls/${pr}`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls/${pr}/files`, { headers }),
    ]);

    if (!prRes.ok) {
      const err = await prRes.json().catch(() => ({}));
      return Response.json({ error: err.message ?? 'Failed to fetch PR' }, { status: prRes.status });
    }
    if (!filesRes.ok) {
      return Response.json({ error: 'Failed to fetch PR files' }, { status: filesRes.status });
    }

    const [prData, filesData] = await Promise.all([prRes.json(), filesRes.json()]);

    const diff = (filesData as Array<{ filename: string; patch?: string }>)
      .map((f) => `--- ${f.filename}\n${f.patch ?? '(binary)'}`)
      .join('\n\n')
      .slice(0, MAX_DIFF_CHARS);

    return Response.json({
      title: prData.title as string,
      body: (prData.body as string | null) ?? '',
      filesChanged: (filesData as Array<{ filename: string }>).map((f) => f.filename),
      diff,
    });
  } catch (err) {
    console.error('[/api/github/pr]', err);
    return Response.json({ error: 'Failed to fetch GitHub PR' }, { status: 500 });
  }
}
