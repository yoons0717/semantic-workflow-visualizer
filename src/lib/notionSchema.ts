// Notion DB 스키마 조회 및 표준 속성 키 탐지 유틸

export type OptionItem = { name: string };
export type RawProperty = {
  type: string;
  status?: { options: OptionItem[] };
  select?: { options: OptionItem[] };
};
export type PropertySchema = Record<string, RawProperty>;

export async function fetchDbSchema(databaseId: string, apiKey: string): Promise<PropertySchema> {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      // SDK 타입에서 properties가 제거된 2026-03-11 이전 버전 고정
      'Notion-Version': '2022-06-28',
    },
  });
  if (!res.ok) return {};
  const data = await res.json() as { properties?: PropertySchema };
  return data.properties ?? {};
}

export function findTitleKey(schema: PropertySchema): string {
  return Object.keys(schema).find((k) => schema[k].type === 'title') ?? 'title';
}

export function findStatusKey(schema: PropertySchema): string | undefined {
  return Object.keys(schema).find((k) => {
    const t = schema[k].type;
    return t === 'status' || (t === 'select' && /^(status|상태|state)$/i.test(k));
  });
}

export function findPriorityKey(schema: PropertySchema): string | undefined {
  return Object.keys(schema).find((k) => {
    const t = schema[k].type;
    return t === 'select' && /^(priority|우선순위|importance)$/i.test(k);
  });
}

export function extractOptions(prop: RawProperty): string[] {
  if (prop.type === 'status') return prop.status?.options.map((o) => o.name) ?? [];
  if (prop.type === 'select') return prop.select?.options.map((o) => o.name) ?? [];
  return [];
}
