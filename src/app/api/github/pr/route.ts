// GET /api/github/pr?repo=owner/repo&pr=123 — GitHub PR 제목·본문·diff·파일 원본 반환
const MAX_DIFF_CHARS = 12000;
const MAX_FILE_CONTENT_CHARS = 5000;
const MAX_FILES_WITH_CONTENT = 5;

interface PRFile {
  filename: string;
  patch?: string;
  status: string;
}

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

    const full = (filesData as PRFile[])
      .map((f) => `--- ${f.filename}\n${f.patch ?? '(binary)'}`)
      .join('\n\n');
    const diff = full.length > MAX_DIFF_CHARS
      ? full.slice(0, full.lastIndexOf('\n', MAX_DIFF_CHARS))
      : full;

    const headSha = (prData as { head: { sha: string } }).head.sha;
    const filesToFetch = (filesData as PRFile[])
      .filter((f) => f.patch && f.status !== 'removed')
      .slice(0, MAX_FILES_WITH_CONTENT);

    const fileContents = await Promise.all(
      filesToFetch.map(async (f) => {
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/contents/${f.filename}?ref=${headSha}`,
          { headers },
        );
        if (!res.ok) return { filename: f.filename, content: '' };
        const data = await res.json() as { content?: string };
        if (!data.content) return { filename: f.filename, content: '' };
        const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
        const content = decoded.length > MAX_FILE_CONTENT_CHARS
          ? decoded.slice(0, MAX_FILE_CONTENT_CHARS) + '\n... (truncated)'
          : decoded;
        return { filename: f.filename, content };
      }),
    );

    return Response.json({
      title: prData.title as string,
      body: (prData.body as string | null) ?? '',
      filesChanged: (filesData as PRFile[]).map((f) => f.filename),
      diff,
      fileContents,
    });
  } catch (err) {
    console.error('[/api/github/pr]', err);
    return Response.json({ error: 'Failed to fetch GitHub PR' }, { status: 500 });
  }
}
