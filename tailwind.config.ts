import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "bg-main": "#F0EEE9",
        "solar-light": "#F6F5F2",
        "solar-dark": "#0F172A",
        "solar-card": "#FFFFFF",
        "brand-primary": "#B7D1EA",
        "brand-primary-hover": "#99BFE3",
      },
      fontFamily: {
        notoSansThai: ["var(--font-noto-sans-thai)", "sans-serif"],
      },
    },
  },
};

export default config;
