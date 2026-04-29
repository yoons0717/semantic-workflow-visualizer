type OptionItem = { name: string };
type RawProperty = {
  type: string;
  status?: { options: OptionItem[]; groups: Array<{ options: OptionItem[] }> };
  select?: { options: OptionItem[] };
};
type RawSchema = Record<string, RawProperty>;

async function fetchSchema(databaseId: string, apiKey: string): Promise<RawSchema> {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
    },
  });
  if (!res.ok) return {};
  const data = await res.json() as { properties?: RawSchema };
  return data.properties ?? {};
}

function extractOptions(prop: RawProperty): string[] {
  if (prop.type === 'status') {
    return prop.status?.options.map((o) => o.name) ?? [];
  }
  if (prop.type === 'select') {
    return prop.select?.options.map((o) => o.name) ?? [];
  }
  return [];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.NOTION_API_KEY) {
    return Response.json({ error: 'NOTION_API_KEY not configured' }, { status: 500 });
  }

  const { id } = await params;
  const schema = await fetchSchema(id, process.env.NOTION_API_KEY);

  const statusKey = Object.keys(schema).find((k) => {
    const t = schema[k].type;
    return t === 'status' || (t === 'select' && /^(status|상태|state)$/i.test(k));
  });

  const priorityKey = Object.keys(schema).find((k) => {
    const t = schema[k].type;
    return t === 'select' && /^(priority|우선순위|importance)$/i.test(k);
  });

  return Response.json({
    statusOptions: statusKey ? extractOptions(schema[statusKey]) : [],
    priorityOptions: priorityKey ? extractOptions(schema[priorityKey]) : [],
  });
}
