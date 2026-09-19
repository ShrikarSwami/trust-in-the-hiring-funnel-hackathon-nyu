// Copy of email-scanner/backend/src/types.ts: keep in sync.
export type Severity = "hard" | "soft";
export type FlagType = "domain_mismatch" | "misspelling" | "llm_tone" | "llm_plausibility";
export type Field = "sender" | "subject" | "body";
export type Verdict = "Legitimate" | "Suspicious" | "Likely Scam";
export type LlmStatus = "ok" | "unavailable" | "disabled";

export interface ScanRequest {
  sender_name: string;
  sender_email: string;
  subject: string;
  body: string; // plain text, \n line endings; all body offsets index into this exact string
}

export interface Flag {
  type: FlagType;
  severity: Severity;
  field: Field;
  span_start: number;
  span_end: number;
  reason: string;
}

export interface Verified {
  field: Field;
  span_start: number;
  span_end: number;
  note: string;
}

export interface ScanResult {
  verdict: Verdict;
  flags: Flag[];
  verified: Verified[];
  llm_status: LlmStatus;
  llm_summary: string | null;
  checked_at: string;
}

/** The exact string the task pane renders for the sender row; "sender" offsets index into it. */
export function senderLine(req: Pick<ScanRequest, "sender_name" | "sender_email">): string {
  const name = req.sender_name.trim();
  return name ? `${name} <${req.sender_email}>` : req.sender_email;
}
