// POST /api/notion/rows — Notion DB에 새 페이지(이슈) 생성. DB 스키마를 동적으로 조회해 컬럼명·언어 무관하게 매핑
import { Client } from '@notionhq/client';
import type { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints';
import { z } from 'zod';

const BodySchema = z.object({
  database_id: z.string(),
  title: z.string(),
  status: z.string().optional(),
  priority: z.string().optional(),
  content: z.string().optional(),
});

type PageProperties = CreatePageParameters['properties'];
type OptionItem = { name: string };
type RawProperty = {
  type: string;
  status?: { options: OptionItem[] };
  select?: { options: OptionItem[] };
};
type PropertySchema = Record<string, RawProperty>;

async function getDbSchema(databaseId: string, apiKey: string): Promise<PropertySchema> {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
    },
  });
  if (!res.ok) return {};
  const data = await res.json() as { properties?: PropertySchema };
  return data.properties ?? {};
}

export async function POST(req: Request) {
  if (!process.env.NOTION_API_KEY) {
    return Response.json({ error: 'NOTION_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = BodySchema.parse(await req.json());
    const notion = new Client({ auth: process.env.NOTION_API_KEY });

    console.log('[/api/notion/rows] body:', JSON.stringify(body));

    const schema = await getDbSchema(body.database_id, process.env.NOTION_API_KEY);
    console.log('[/api/notion/rows] schema keys:', Object.keys(schema).map(k => `${k}(${schema[k].type})`));

    const titleKey = Object.keys(schema).find((k) => schema[k].type === 'title') ?? 'title';
    console.log('[/api/notion/rows] titleKey:', titleKey);

    const statusKey = Object.keys(schema).find((k) => {
      const t = schema[k].type;
      return t === 'status' || (t === 'select' && /^(status|상태|state)$/i.test(k));
    });

    const priorityKey = Object.keys(schema).find((k) => {
      const t = schema[k].type;
      return t === 'select' && /^(priority|우선순위|importance)$/i.test(k);
    });

    const pageProps: Record<string, unknown> = {};

    pageProps[titleKey] = { title: [{ text: { content: body.title } }] };

    if (statusKey && body.status) {
      const prop = schema[statusKey];
      const options = prop.type === 'status'
        ? (prop.status?.options ?? [])
        : (prop.select?.options ?? []);
      const match = options.find((o) => o.name.toLowerCase() === body.status!.toLowerCase());
      if (match) {
        pageProps[statusKey] = prop.type === 'status'
          ? { status: { name: match.name } }
          : { select: { name: match.name } };
      }
    }

    if (priorityKey && body.priority) {
      const prop = schema[priorityKey];
      const options = prop.select?.options ?? [];
      const match = options.find((o) => o.name.toLowerCase() === body.priority!.toLowerCase());
      if (match) {
        pageProps[priorityKey] = { select: { name: match.name } };
      }
    }

    const page = await notion.pages.create({
      parent: { database_id: body.database_id },
      properties: pageProps as PageProperties,
      ...(body.content
        ? {
            children: [
              {
                object: 'block' as const,
                type: 'paragraph' as const,
                paragraph: {
                  rich_text: [{ type: 'text' as const, text: { content: body.content } }],
                },
              },
            ],
          }
        : {}),
    });

    return Response.json({ url: 'url' in page ? page.url : null });
  } catch (err) {
    console.error('[/api/notion/rows]', err);
    return Response.json({ error: 'Failed to create row' }, { status: 500 });
  }
}
