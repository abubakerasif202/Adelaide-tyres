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

export async function sendNotification(message: Message): Promise<{ delivered: boolean }> {
  if (!isNotifyConfigured()) {
    console.info("[notify:dev] Transport is not configured; no notification sent.");
    return { delivered: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
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
