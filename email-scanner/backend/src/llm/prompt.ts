import { senderLine, type ScanRequest } from "../types.js";

const MAX_BODY_CHARS = 6000; // llama3:70b context is 8192 tokens on Thor

export const SYSTEM_PROMPT = `You are a fraud analyst reviewing recruiting and job-offer emails received by job seekers.
Identify specific phrases that suggest a recruiting scam, such as:
- pressure or urgency ("respond within 24 hours", "offer expires today")
- requests for money, bank details, SSN, ID documents, or equipment purchases before a formal hiring process
- unrealistic pay for little work, hiring without an interview, interviews only via Telegram/WhatsApp/Signal chat
- generic greetings ("Dear Applicant"), vague job details, unprofessional or manipulative wording
Rules:
- quoted_span MUST be copied verbatim from the email subject or body: 3 to 15 words, no paraphrasing.
- category "tone" = pressure, urgency, manipulative or unprofessional wording.
- category "plausibility" = claims or requests a real employer would not make.
- reason: one short sentence (8-20 words) explaining why the phrase is suspicious, never just the category name.
- The sender address is checked separately; do not comment on it or on spelling.
- A normal, professional recruiter email must get an EMPTY findings list. Scheduling an interview,
  describing benefits, or asking for a resume is normal.
- overall: one short sentence summarizing your impression.
Respond with JSON only.`;

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          quoted_span: { type: "string" },
          category: {
            type: "string",
            enum: ["tone", "plausibility"],
            description: "\"tone\" = pressure, urgency, manipulative or unprofessional wording. \"plausibility\" = claims or requests a real employer would not make.",
          },
          reason: {
            type: "string",
            description: "One sentence explaining why this phrase is a scam warning sign",
          },
        },
        required: ["quoted_span", "category", "reason"],
      },
    },
    overall: { type: "string" },
  },
  required: ["findings", "overall"],
} as const;

export function buildUserPrompt(req: ScanRequest): string {
  return `From: ${senderLine(req)}\nSubject: ${req.subject}\n\nBody:\n${req.body.slice(0, MAX_BODY_CHARS)}`;
}
