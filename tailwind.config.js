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
        0: "0",
        1: "calc(var(--space-2xs) * 0.75)",
        2: "var(--space-2xs)",
        3: "var(--space-xs)",
        4: "var(--space-s)",
        5: "var(--space-m)",
        6: "calc(var(--space-m) * 1.2)",
        7: "calc(var(--space-m) * 1.35)",
        8: "var(--space-l)",
        10: "calc(var(--space-l) * 1.25)",
        12: "var(--space-xl)",
        xs: "var(--space-xs)",
        s: "var(--space-s)",
        m: "var(--space-m)",
        l: "var(--space-l)",
        xl: "var(--space-xl)",
        container: "var(--space-l)",
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
        "4xl": "var(--text-4xl)",
        "5xl": "var(--text-5xl)",
        "6xl": "var(--text-6xl)",
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
        md: "calc(var(--radius-lg) * 0.75)",
        lg: "var(--radius-lg)",
        xl: "calc(var(--radius-lg) * 1.25)",
        "2xl": "calc(var(--radius-lg) * 1.5)",
        "3xl": "calc(var(--radius-lg) * 1.75)",
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
