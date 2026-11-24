import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#7C5CFF", hover: "#6846F0", soft: "#EFEAFF" },
        background: "#F5F6FA",
        surface: "#FFFFFF",
        ink: "#171827",
        muted: "#6B7288",
        line: "#E6E8F0",
        success: "#22C55E",
        warning: "#F5B942",
        danger: "#FF6B7A",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23, 24, 39, .06)",
        lift: "0 8px 20px rgba(108, 77, 255, .22)",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        tiny: ["9px", { lineHeight: "11px" }],
        xs: ["10px", { lineHeight: "13px" }],
        sm: ["12px", { lineHeight: "16px" }],
        base: ["13px", { lineHeight: "16px" }],
        lg: ["14px", { lineHeight: "18px" }],
        xl: ["16px", { lineHeight: "20px" }],
        "2xl": ["18px", { lineHeight: "22px" }],
        "3xl": ["20px", { lineHeight: "24px" }],
        "4xl": ["22px", { lineHeight: "26px" }],
      },
      borderRadius: {
        md: "8px",
        lg: "8px",
        xl: "10px",
        "2xl": "12px",
        "3xl": "16px",
      },
    },
  },
  plugins: [],
};

export default config;
