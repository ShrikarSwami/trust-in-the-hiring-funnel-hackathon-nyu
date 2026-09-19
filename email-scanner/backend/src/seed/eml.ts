import MailComposer from "nodemailer/lib/mail-composer/index.js";

export function buildEml(
  email: { id: string; sender_name: string; sender_email: string; subject: string; body: string },
  opts: { to: string; date: Date },
): Promise<Buffer> {
  const mail = new MailComposer({
    from: { name: email.sender_name, address: email.sender_email },
    to: opts.to,
    subject: email.subject,
    text: email.body,
    date: opts.date,
    messageId: `<${email.id}.${opts.date.getTime()}@trust-scanner.local>`,
    headers: { "X-Trust-Scanner-Synthetic": email.id },
  });
  return new Promise((resolve, reject) => mail.compile().build((err, msg) => (err ? reject(err) : resolve(msg))));
}
