import * as React from "react";

export function useSweep(
  active: boolean,
  contentRef: React.RefObject<HTMLElement>,
  lineRef: React.RefObject<HTMLElement>,
  scrollRef: React.RefObject<HTMLElement>,
  onDone: () => void
) {
  React.useEffect(() => {
    const content = contentRef.current, line = lineRef.current, scroller = scrollRef.current;
    if (!active || !content || !line || !scroller) return undefined;
    const marks = Array.from(content.querySelectorAll<HTMLElement>("[data-mark]"));
    const finish = () => { marks.forEach((m) => m.classList.add("lit")); onDone(); };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return undefined;
    }
    const height = content.scrollHeight;
    const duration = Math.min(4500, Math.max(1800, (height / 400) * 1000));
    let frame = 0;
    const start = performance.now();
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      const y = progress * height;
      line.style.transform = `translateY(${y}px)`;
      for (const mark of marks) if (mark.offsetTop <= y) mark.classList.add("lit");
      scroller.scrollTop = Math.max(0, y - scroller.clientHeight / 2);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, contentRef, lineRef, scrollRef, onDone]);
}
