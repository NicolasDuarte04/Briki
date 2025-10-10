import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  // darkMode: ["class"], // Disabled for light-only theme
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/pages/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        "display-xl": [
          "clamp(2.5rem,5vw,3.5rem)",
          { lineHeight: "1.1", letterSpacing: "-0.015em", fontWeight: "700" }
        ],
        headline: [
          "clamp(1.5rem,2.5vw,2.25rem)",
          { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" }
        ],
        subhead: [
          "clamp(1rem,1.5vw,1.125rem)",
          { lineHeight: "1.65", letterSpacing: "-0.01em", fontWeight: "400" }
        ],
        body: [
          "1rem",
          { lineHeight: "1.7", letterSpacing: "0", fontWeight: "400" }
        ],
      },
      fontWeight: {
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
      },
      maxWidth: {
        prose: "65ch",
        "prose-narrow": "55ch",
        "prose-wide": "75ch",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        success: "hsl(var(--success))",
        "success-foreground": "hsl(var(--success-foreground))",
        warning: "hsl(var(--warning))",
        "warning-foreground": "hsl(var(--warning-foreground))",
        sidebar: "hsl(var(--sidebar))",
        "sidebar-foreground": "hsl(var(--sidebar-foreground))",
        "sidebar-border": "hsl(var(--sidebar-border))",
        "sidebar-ring": "hsl(var(--sidebar-ring))",
        "sidebar-primary": "hsl(var(--sidebar-primary))",
        "sidebar-primary-foreground": "hsl(var(--sidebar-primary-foreground))",
        "sidebar-accent": "hsl(var(--sidebar-accent))",
        "sidebar-accent-foreground": "hsl(var(--sidebar-accent-foreground))",
        "chart-1": "hsl(var(--chart-1))",
        "chart-2": "hsl(var(--chart-2))",
        "chart-3": "hsl(var(--chart-3))",
        "chart-4": "hsl(var(--chart-4))",
        "chart-5": "hsl(var(--chart-5))",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Consolas",
          "Liberation Mono",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        "display-xl": [
          "clamp(2.5rem,5vw,3.5rem)",
          { lineHeight: "1.1", letterSpacing: "-0.015em", fontWeight: "700" }
        ],
        headline: [
          "clamp(1.5rem,2.5vw,2.25rem)",
          { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" }
        ],
        subhead: [
          "clamp(1rem,1.5vw,1.125rem)",
          { lineHeight: "1.65", letterSpacing: "-0.01em", fontWeight: "400" }
        ],
        body: [
          "1rem",
          { lineHeight: "1.7", letterSpacing: "0", fontWeight: "400" }
        ],
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        card: "20px",
        button: "14px",
        full: "9999px",
      },
      boxShadow: {
        xs: "0 1px 0 0 rgba(15,23,42,0.05)",
        button: "0 18px 42px -24px rgba(15,23,42,0.35)",
        "elev-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "elev-md": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "elev-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "elev-nav": "0 4px 12px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
