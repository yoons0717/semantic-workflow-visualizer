// GET /api/github/repos — 인증된 사용자의 레포 목록 반환 (업데이트순)
export async function GET() {
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
      'https://api.github.com/user/repos?per_page=100&sort=updated&type=all',
      { headers },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json({ error: (err as { message?: string }).message ?? 'Failed to fetch repos' }, { status: res.status });
    }

    const data = await res.json() as Array<{ full_name: string; private: boolean }>;
    return Response.json(data.map(({ full_name, private: isPrivate }) => ({ full_name, private: isPrivate })));
  } catch (err) {
    console.error('[/api/github/repos]', err);
    return Response.json({ error: 'Failed to fetch GitHub repos' }, { status: 500 });
  }
}
