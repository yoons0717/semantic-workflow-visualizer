import { Client } from '@notionhq/client';
import { z } from 'zod';

const BodySchema = z.object({
  database_id: z.string(),
  title: z.string(),
  status: z.string().optional(),
  priority: z.string().optional(),
});

export async function POST(req: Request) {
  if (!process.env.NOTION_API_KEY) {
    return Response.json({ error: 'NOTION_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = BodySchema.parse(await req.json());
    const notion = new Client({ auth: process.env.NOTION_API_KEY });

    const page = await notion.pages.create({
      parent: { database_id: body.database_id },
      properties: {
        title: {
          title: [{ text: { content: body.title } }],
        },
      },
    });

    return Response.json({ url: 'url' in page ? page.url : null });
  } catch {
    return Response.json({ error: 'Failed to create row' }, { status: 500 });
  }
}
