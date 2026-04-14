export async function POST(req: Request) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    return Response.json({ ok: false });
  }

  try {
    const { channel, message } = await req.json();
    const res = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `[${channel ?? '#general'}] ${message}` }),
    });
    return Response.json({ ok: res.ok });
  } catch {
    return Response.json({ ok: false });
  }
}
