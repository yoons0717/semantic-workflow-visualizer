import { Client } from '@notionhq/client';

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

    const databases = res.results
      .map((db) => {
        const title =
          'title' in db && Array.isArray(db.title) && db.title[0]?.plain_text
            ? db.title[0].plain_text
            : 'Untitled';
        const icon =
          'icon' in db && db.icon?.type === 'emoji' ? db.icon.emoji : undefined;
        const parent = 'parent' in db ? db.parent : undefined;
        const actualId =
          parent && 'database_id' in parent ? parent.database_id : db.id;
        return { id: actualId, title, icon };
      });

    return Response.json(databases);
  } catch {
    return Response.json({ error: 'Failed to fetch databases' }, { status: 500 });
  }
}
