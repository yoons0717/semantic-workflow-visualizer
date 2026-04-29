// GET /api/notion/databases/[id] — 특정 DB의 status·priority 실제 옵션 목록 반환 (TaskCard 드롭다운용)
import { fetchDbSchema, findStatusKey, findPriorityKey, extractOptions } from '@/lib/notionSchema';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.NOTION_API_KEY) {
    return Response.json({ error: 'NOTION_API_KEY not configured' }, { status: 500 });
  }

  const { id } = await params;
  const schema = await fetchDbSchema(id, process.env.NOTION_API_KEY);

  const statusKey = findStatusKey(schema);
  const priorityKey = findPriorityKey(schema);

  return Response.json({
    statusOptions: statusKey ? extractOptions(schema[statusKey]) : [],
    priorityOptions: priorityKey ? extractOptions(schema[priorityKey]) : [],
  });
}
