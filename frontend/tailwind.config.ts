import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#4ADE80",
          dark: "#1a1a1a",
          background: "#FFFFFF",
          secondary: "#F0FDF4",
          text: "#111827",
          subtle: "#BBF7D0"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(74, 222, 128, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
