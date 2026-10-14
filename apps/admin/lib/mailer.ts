import "server-only";

/**
 * Outbound mail. There is no provider yet, so in development the message is
 * logged and the link is printed for you to click.
 *
 * Swap the body of `sendMail` for Resend/SES when one is chosen; nothing that
 * calls it needs to change. It must stay non-throwing: a mail failure should
 * never reveal, through a different error, whether an account exists.
 */
export async function sendMail(message: {
  to: string;
  subject: string;
  body: string;
  link?: string;
}): Promise<void> {
  if (process.env.NODE_ENV === "production" && !process.env.MAIL_TRANSPORT) {
    console.error(
      "[mail] no transport configured; refusing to log a token in production",
    );
    return;
  }
  console.log(
    [
      "",
      "──────────── ✉️  outbound mail (dev) ────────────",
      `to:      ${message.to}`,
      `subject: ${message.subject}`,
      "",
      message.body,
      message.link ? `\n🔗 ${message.link}\n` : "",
      "─────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

export function adminBaseUrl(): string {
  return (
    process.env.ADMIN_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001"
  );
}
