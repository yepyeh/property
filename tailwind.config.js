/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte,md,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        card: "#121212",
        accent: {
          DEFAULT: "#98ff98",
          hover: "#7dfa7d",
        },
      },
      transitionTimingFunction: {
        luxury: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      boxShadow: {
        luxury: "0 24px 64px -32px rgba(0, 0, 0, 0.72)",
        soft: "0 0 0 1px rgba(255,255,255,0.04), 0 12px 32px rgba(0,0,0,0.32)",
      },
      borderRadius: {
        "2.5xl": "1.5rem",
        "3xl": "1.75rem",
      },
      spacing: {
        4.5: "1.125rem",
        5.5: "1.375rem",
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};
