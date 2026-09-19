/* global Office */
import type { ScanRequest } from "../types";

export function readCurrentEmail(): Promise<ScanRequest> {
  const item = Office.context.mailbox.item as Office.MessageRead | undefined;
  if (!item?.body) return Promise.reject(new Error("Open an email in Outlook, then scan again."));
  return new Promise((resolve, reject) => {
    item.body.getAsync(Office.CoercionType.Text, (r) => {
      if (r.status !== Office.AsyncResultStatus.Succeeded) {
        reject(new Error(r.error?.message || "Could not read this email. Try reopening it."));
        return;
      }
      resolve({
        sender_name: item.from?.displayName ?? "",
        sender_email: item.from?.emailAddress ?? "",
        subject: item.subject ?? "",
        body: (r.value ?? "").replace(/\r\n/g, "\n").trim(),
      });
    });
  });
}
