import { useEffect, useRef } from "react";

export function Embers({ count = 30 }: { count?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      const size = 2 + Math.random() * 4;
      s.style.cssText = `position:absolute;bottom:-10px;left:${Math.random() * 100}%;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle, oklch(0.88 0.18 88) 0%, oklch(0.55 0.25 25 / 0.4) 60%, transparent 100%);animation:ember ${8 + Math.random() * 10}s linear ${Math.random() * 8}s infinite;filter:blur(0.5px);`;
      el.appendChild(s);
    }
  }, [count]);
  return <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" />;
}
