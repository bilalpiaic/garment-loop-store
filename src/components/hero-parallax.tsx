"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Subtle scroll parallax for the home hero media plane. */
export function HeroParallax({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 520);
        node.style.transform = `translate3d(0, ${y * 0.22}px, 0) scale(1.06)`;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={ref} className="hero-parallax-media absolute inset-0 will-change-transform">
      {children}
    </div>
  );
}
