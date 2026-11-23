import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#7C5CFF", hover: "#6846F0", soft: "#241B4A" },
        background: "#070B18",
        surface: "#12182B",
        ink: "#F5F7FB",
        muted: "#9AA3B8",
        line: "#2A3148",
        success: "#3DDC97",
        warning: "#F5B942",
        danger: "#FF6B7A",
      },
      boxShadow: {
        card: "0 1px 2px rgba(4, 6, 16, .28)",
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
