import { Client } from '@notionhq/client';
import { z } from 'zod';

const BodySchema = z.object({
  parent_page_id: z.string(),
  title: z.string(),
  content: z.string().optional(),
});

export async function POST(req: Request) {
  if (!process.env.NOTION_API_KEY) {
    return Response.json({ error: 'NOTION_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = BodySchema.parse(await req.json());
    const notion = new Client({ auth: process.env.NOTION_API_KEY });

    const children = body.content
      ? [
          {
            object: 'block' as const,
            type: 'paragraph' as const,
            paragraph: {
              rich_text: [{ type: 'text' as const, text: { content: body.content } }],
            },
          },
        ]
      : [];

    const page = await notion.pages.create({
      parent: { page_id: body.parent_page_id },
      properties: {
        title: {
          title: [{ text: { content: body.title } }],
        },
      },
      children,
    });

    return Response.json({ url: 'url' in page ? page.url : null });
  } catch {
    return Response.json({ error: 'Failed to create page' }, { status: 500 });
  }
}
