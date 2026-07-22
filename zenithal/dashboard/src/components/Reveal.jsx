import React, { useEffect, useRef, useState } from "react";

// Scroll-reveal wrapper — the "whileInView" fade/rise/blur-in used throughout
// the Landing page. Fires once per element the first time it enters view.
export default function Reveal({ children, delay = 0, style = {}, as: Tag = "div", ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.18 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <Tag
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        filter: visible ? "blur(0)" : "blur(8px)",
        transition: "opacity .9s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1), filter .9s cubic-bezier(.22,1,.36,1)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
