// GET /api/notion/databases — 연결된 Notion 워크스페이스의 DB 목록 반환 (TaskCard DB 셀렉터용)
import { Client } from '@notionhq/client';

interface NotionDataSourceResult {
  id: string;
  object: string;
  title?: Array<{ plain_text: string }>;
  icon?: { type: string; emoji?: string };
  parent?: { type: string; database_id?: string };
}

export async function GET() {
  if (!process.env.NOTION_API_KEY) {
    return Response.json({ error: 'NOTION_API_KEY not configured' }, { status: 500 });
  }

  try {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const res = await notion.search({
      filter: { property: 'object', value: 'data_source' as 'page' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
    });

    const databases = (res.results as NotionDataSourceResult[])
      .map((db) => {
        const title = db.title?.[0]?.plain_text ?? 'Untitled';
        const icon = db.icon?.type === 'emoji' ? db.icon.emoji : undefined;
        const actualId = db.parent?.database_id ?? db.id;
        return { id: actualId, title, icon };
      });

    return Response.json(databases);
  } catch {
    return Response.json({ error: 'Failed to fetch databases' }, { status: 500 });
  }
}
