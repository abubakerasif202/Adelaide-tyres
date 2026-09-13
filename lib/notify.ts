/**
 * Outbound notification transport. Uses Resend when configured, otherwise a
 * no-op logging transport so development submissions are validated + logged,
 * never silently dropped and never emailed through an unrelated domain.
 */

type Message = {
  subject: string;
  text: string;
  replyTo?: string;
};

export function isNotifyConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.ENQUIRY_TO_EMAIL &&
      process.env.ENQUIRY_FROM_EMAIL,
  );
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * Local cross-system testing only: deliver to a loopback stand-in instead of
 * Resend so a paid order can complete its notification step without any
 * network egress. Non-loopback values are ignored, so production traffic can
 * never be redirected.
 */
function transportEndpoint(): string {
  const base = process.env.NOTIFY_API_BASE;
  if (base) {
    try {
      const url = new URL(base);
      if (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname)) return `${url.origin}/emails`;
    } catch { /* fall through to the real transport */ }
  }
  return "https://api.resend.com/emails";
}

export async function sendNotification(message: Message): Promise<{ delivered: boolean }> {
  if (!isNotifyConfigured()) {
    console.info("[notify:dev] Transport is not configured; no notification sent.");
    return { delivered: false };
  }

  const res = await fetch(transportEndpoint(), {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.ENQUIRY_FROM_EMAIL,
      to: process.env.ENQUIRY_TO_EMAIL,
      reply_to: message.replyTo,
      subject: message.subject,
      text: message.text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Notification transport failed: ${res.status}`);
  }
  return { delivered: true };
}
