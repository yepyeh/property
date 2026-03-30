/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte,md,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        card: "var(--card)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        border: "var(--border)",
        muted: "var(--muted)",
      },
      spacing: {
        xs: "var(--space-xs)",
        s: "var(--space-s)",
        m: "var(--space-m)",
        l: "var(--space-l)",
        xl: "var(--space-xl)",
        container: "var(--space-l)",
      },
      fontSize: {
        base: "var(--text-base)",
        lg: "var(--text-lg)",
        display: [
          "var(--text-display)",
          {
            lineHeight: "0.92",
            letterSpacing: "-0.06em",
            fontWeight: "600",
          },
        ],
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        full: "var(--radius-full)",
      },
      backdropBlur: {
        glass: "var(--glass-blur)",
      },
      transitionTimingFunction: {
        luxury: "var(--transition-luxury)",
      },
    },
  },
  plugins: [],
};
