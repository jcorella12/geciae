import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // shadcn HSL tokens (compat)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ---- v2 tokens (oklch via CSS vars) ----
        // Brand (rebindea por [data-empresa])
        brand: {
          DEFAULT: "var(--brand)",
          deep: "var(--brand-deep)",
          darker: "var(--brand-darker)",
          soft: "var(--brand-soft)",
          fg: "var(--brand-fg)",
        },
        "accent-pse": {
          DEFAULT: "var(--accent-token)",
          deep: "var(--accent-deep)",
          soft: "var(--accent-soft)",
        },
        // Tinta (texto, neutrales)
        ink: {
          1: "var(--ink-1)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
          4: "var(--ink-4)",
          5: "var(--ink-5)",
        },
        // Backgrounds neutrales
        bg: {
          1: "var(--bg)",
          2: "var(--bg-2)",
          3: "var(--bg-3)",
          4: "var(--bg-4)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
        },
        divider: "var(--divider)",
        "border-strong": "var(--border-strong)",
        // Estados (con variantes -soft, -deep para bg/text)
        ok: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
          deep: "var(--success-deep)",
        },
        warn: {
          DEFAULT: "var(--warning)",
          soft: "var(--warning-soft)",
          deep: "var(--warning-deep)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
          deep: "var(--danger-deep)",
        },
        info: {
          DEFAULT: "var(--info)",
          soft: "var(--info-soft)",
        },

        // PSE brand palette literal (banda + dots por empresa)
        "brand-primary": "var(--color-brand-primary)",
        "brand-secondary": "var(--color-brand-secondary)",
        pse: "var(--color-pse)",
        ciae: "var(--color-ciae)",
        ied: "var(--color-ied)",
        limson: "var(--color-limson)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
      },
      borderRadius: {
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        "2xl": "var(--r-2xl)",
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
        display: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": "var(--text-2xs)",
      },
      spacing: {
        "sidebar-w": "var(--sidebar-w)",
        "sidebar-w-compact": "var(--sidebar-w-compact)",
        "topbar-h": "var(--topbar-h)",
      },
      width: {
        "sidebar-w": "var(--sidebar-w)",
        "sidebar-w-compact": "var(--sidebar-w-compact)",
      },
      height: {
        "topbar-h": "var(--topbar-h)",
        "row-h": "var(--row-h)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
