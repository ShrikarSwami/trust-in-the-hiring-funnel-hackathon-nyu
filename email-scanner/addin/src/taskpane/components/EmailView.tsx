import * as React from "react";
import { buildSegments, marksFor, type Mark } from "../lib/segments";
import { senderLine, type Field, type ScanRequest, type ScanResult } from "../types";

function Highlighted({ text, marks }: { text: string; marks: Mark[] }) {
  return <>{buildSegments(text, marks).map((s) => s.mark ? (
    <mark key={s.start} id={s.mark.id} data-mark className={`hl ${s.mark.kind === "verified" ? "hl-ok" : `hl-${s.mark.severity}`}`} title={s.mark.reason}>{s.text}</mark>
  ) : <React.Fragment key={s.start}>{s.text}</React.Fragment>)}</>;
}

export function EmailView(props: {
  email: ScanRequest;
  result: ScanResult | null;
  scanning: boolean;
  contentRef: React.RefObject<HTMLDivElement>;
  lineRef: React.RefObject<HTMLDivElement>;
}) {
  const { email, result } = props;
  const marks = (field: Field) => result ? marksFor(result, field) : [];
  return <div className="email" ref={props.contentRef}>
    <div className="email-row"><span className="label">From</span><span className="mono"><Highlighted text={senderLine(email)} marks={marks("sender")} /></span></div>
    <div className="email-row"><span className="label">Subject</span><strong><Highlighted text={email.subject} marks={marks("subject")} /></strong></div>
    <div className="email-body"><Highlighted text={email.body} marks={marks("body")} /></div>
    <div ref={props.lineRef} className={`scanline ${props.scanning ? "scanline-idle" : ""}`} aria-hidden="true" />
  </div>;
}
