// POST /api/webhook/slack — Slack 채널에 메시지 전송 (SLACK_WEBHOOK_URL 필요)
export async function POST(req: Request) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    return Response.json({ error: "SLACK_WEBHOOK_URL not configured" }, { status: 500 });
  }

  try {
    const { channel, message } = await req.json();
    const res = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `[${channel ?? '#general'}] ${message}` }),
    });
    return Response.json({ ok: res.ok });
  } catch (err) {
    console.error('[/api/webhook/slack]', err);
    return Response.json({ error: "Failed to send Slack message" }, { status: 500 });
  }
}
