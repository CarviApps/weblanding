interface P {
  className?: string;
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconHome = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M9.5 20v-5.5h5V20" />
  </svg>
);

export const IconPlate = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

export const IconDumbbell = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
  </svg>
);

export const IconChart = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="m7.5 15.5 3.5-4 3 2.5 4.5-6" />
  </svg>
);

export const IconUser = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.8 20c1-3.6 3.9-5.4 7.2-5.4s6.2 1.8 7.2 5.4" />
  </svg>
);

export const IconMic = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
    <path d="M12 18v3" />
  </svg>
);

export const IconStop = (p: P) => (
  <svg {...p} viewBox="0 0 24 24" fill="currentColor">
    <rect x="7" y="7" width="10" height="10" rx="2.5" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconSun = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconMoon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

export const IconFlame = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-1.9 1-3.4 1.8-4.3.3 1.3 1 2.1 1.9 2.3C10.4 7.6 12 5.3 12 3Z" />
  </svg>
);
