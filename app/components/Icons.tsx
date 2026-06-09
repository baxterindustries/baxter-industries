import type { CSSProperties } from "react";

type IconProps = { color?: string; size?: number };

const base = (size: number): CSSProperties => ({
  width: size,
  height: size,
  display: "block",
});

export function WrenchIcon({ color = "#185fa5", size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size)} aria-hidden="true">
      <path
        d="M14.7 6.3a3.5 3.5 0 0 0-4.6 4.3L3.7 17a2 2 0 0 0 2.8 2.8l6.4-6.4a3.5 3.5 0 0 0 4.3-4.6l-2 2-2-2 2-2.5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkleIcon({ color = "#0c4d3a", size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size)} aria-hidden="true">
      <path
        d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HammerIcon({ color = "#3a3320", size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size)} aria-hidden="true">
      <path
        d="M14.5 5.5l4 4-2.5 2.5-4-4 2.5-2.5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 8l-7.5 7.5a1.8 1.8 0 0 0 2.5 2.5L14.5 10.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HomeIcon({ color = "#185fa5", size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size)} aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 9.5V19h12V9.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 19v-4.5h4V19"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
