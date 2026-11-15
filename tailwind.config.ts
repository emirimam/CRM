import type { Config } from "tailwindcss";

/*
  Colours are declared once, in app/globals.css, as OKLCH components.
  Mapping them through oklch(var(--x) / <alpha-value>) keeps Tailwind's
  opacity modifiers working, so `bg-accent/10` and `text-muted` both behave.

  Deliberately no `stone-*` in the app any more: semantic names only, so
  light and dark stay in step without duplicated class lists.
*/
const token = (name: string) => `oklch(var(${name}) / <alpha-value>)`;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      colors: {
        canvas: token("--c-bg"),
        surface: {
          DEFAULT: token("--c-surface"),
          2: token("--c-surface-2"),
          3: token("--c-surface-3"),
        },
        line: {
          DEFAULT: token("--c-border"),
          strong: token("--c-border-strong"),
        },
        ink: token("--c-text"),
        muted: token("--c-muted"),
        subtle: token("--c-subtle"),
        accent: {
          DEFAULT: token("--c-accent"),
          hover: token("--c-accent-hover"),
          fg: token("--c-accent-fg"),
          soft: token("--c-accent-soft"),
        },
        ok: { DEFAULT: token("--c-ok"), soft: token("--c-ok-soft") },
        warn: { DEFAULT: token("--c-warn"), soft: token("--c-warn-soft") },
        danger: { DEFAULT: token("--c-danger"), soft: token("--c-danger-soft") },
        info: { DEFAULT: token("--c-info"), soft: token("--c-info-soft") },
        ring: token("--ring"),
      },
      borderColor: {
        DEFAULT: token("--c-border"),
      },
      fontSize: {
        // Nudged up from Tailwind's defaults: the old UI leaned on 12px for
        // real content, which is the other half of why it was hard to read.
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        xs: ["0.78125rem", { lineHeight: "1.125rem" }],
        sm: ["0.875rem", { lineHeight: "1.3125rem" }],
        base: ["0.9375rem", { lineHeight: "1.5rem" }],
      },
      boxShadow: {
        xs: "0 1px 2px 0 oklch(0 0 0 / 0.04)",
        sm: "0 1px 3px 0 oklch(0 0 0 / 0.07), 0 1px 2px -1px oklch(0 0 0 / 0.04)",
        md: "0 4px 12px -2px oklch(0 0 0 / 0.08), 0 2px 4px -2px oklch(0 0 0 / 0.05)",
        pop: "0 8px 30px -6px oklch(0 0 0 / 0.14), 0 2px 6px -2px oklch(0 0 0 / 0.07)",
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
      },
      transitionTimingFunction: {
        snap: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(3px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.22s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
