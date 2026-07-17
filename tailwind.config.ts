import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        body: ['var(--font-manrope)', 'Manrope', 'sans-serif'],
        headline: ['Space Grotesk', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
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
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        status: {
          green: "hsl(var(--status-green))",
          yellow: "hsl(var(--status-yellow))",
          orange: "hsl(var(--status-orange))",
          red: "hsl(var(--status-red))",
        },
        // Landing-page-derived accent hues (Addendum 18) — additive namespace,
        // raw literal hex since these are decorative accents, not full theme
        // roles like primary/accent. Kept numerically in sync with the
        // --vy-* CSS vars in globals.css.
        vy: {
          purple: "#a855f7",
          "purple-dark": "#7c3aed",
          pink: "#ec4899",
          "pink-light": "#f472b6",
          indigo: "#818cf8",
          "indigo-dark": "#4338ca",
          cyan: "#22d3ee",
          "cyan-light": "#67e8f9",
          green: "#34d399",
          star: "hsl(var(--vy-star))",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
        "gradient-glow": "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--accent) / 0.22), transparent 70%)",
        // Landing-page-derived gradients (Addendum 18) — additive, opt-in via
        // new component variants only; existing gradient-primary is untouched.
        "gradient-vy-card": "linear-gradient(155deg, #1a1330 0%, #0d0a18 100%)",
        "gradient-vy-purple-pink": "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
        "gradient-vy-cta": "linear-gradient(140deg, #7c3aed 0%, #a855f7 45%, #ec4899 100%)",
      },
      boxShadow: {
        "glow-sm": "0 0 20px -6px hsl(var(--accent) / 0.45)",
        glow: "0 0 40px -8px hsl(var(--accent) / 0.55)",
        "glow-primary": "0 0 30px -6px hsl(var(--primary) / 0.6)",
        "glow-vy": "0 8px 30px rgba(168,85,247,0.45)",
        "glow-vy-lg": "0 8px 46px rgba(236,72,153,0.5), 0 0 60px rgba(168,85,247,0.3)",
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
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" },
        },
        // Promoted from src/app/landing.css (Addendum 18) so any component can
        // opt into these via animate-vy-* instead of duplicating keyframes.
        // Per the animation policy in Addendum 18, vy-drift/vy-strobe/vy-shimmer/
        // vy-orbit stay landing-page-only in practice — promoted here for
        // completeness, not because they're meant to be used elsewhere yet.
        "vy-drift1": { "0%,100%": { transform: "translate(-10%,-8%) scale(1)" }, "50%": { transform: "translate(12%,10%) scale(1.25)" } },
        "vy-drift2": { "0%,100%": { transform: "translate(8%,6%) scale(1.1)" }, "50%": { transform: "translate(-14%,-10%) scale(0.85)" } },
        "vy-drift3": { "0%,100%": { transform: "translate(0,0) scale(1)" }, "50%": { transform: "translate(-8%,14%) scale(1.3)" } },
        "vy-strobe": { "0%,92%,100%": { opacity: "0" }, "94%,98%": { opacity: "0.14" } },
        "vy-float": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        "vy-glow": {
          "0%,100%": { boxShadow: "0 8px 30px rgba(168,85,247,0.45), 0 0 0 rgba(236,72,153,0)" },
          "50%": { boxShadow: "0 8px 46px rgba(236,72,153,0.6), 0 0 60px rgba(168,85,247,0.35)" },
        },
        "vy-eq": { "0%": { transform: "scaleY(0.18)" }, "100%": { transform: "scaleY(1)" } },
        "vy-ripple": { "0%": { transform: "scale(0.7)", opacity: "0.7" }, "100%": { transform: "scale(2.2)", opacity: "0" } },
        "vy-beat": { "0%,100%": { transform: "scale(1)" }, "15%": { transform: "scale(1.18)" }, "30%": { transform: "scale(1)" }, "45%": { transform: "scale(1.12)" } },
        "vy-spark": { "0%": { transform: "scale(0) rotate(0deg)", opacity: "0" }, "40%": { opacity: "1" }, "100%": { transform: "scale(1.1) rotate(120deg)", opacity: "0" } },
        "vy-dash": { to: { strokeDashoffset: "0" } },
        "vy-ring": { to: { strokeDashoffset: "47.5" } },
        "vy-live": { "0%,100%": { opacity: "1", transform: "scale(1)" }, "50%": { opacity: "0.35", transform: "scale(0.7)" } },
        "vy-scroll": { "0%": { transform: "translateY(0)", opacity: "0" }, "30%": { opacity: "1" }, "100%": { transform: "translateY(10px)", opacity: "0" } },
        "vy-shimmer": { "0%": { transform: "translateX(-120%)" }, "100%": { transform: "translateX(220%)" } },
        "vy-orbit": { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-out",
        "collapsible-up": "collapsible-up 0.2s ease-out",
        "vy-drift1": "vy-drift1 9s ease-in-out infinite",
        "vy-drift2": "vy-drift2 11s ease-in-out infinite",
        "vy-drift3": "vy-drift3 13s ease-in-out infinite",
        "vy-strobe": "vy-strobe 6s steps(1) infinite",
        "vy-float": "vy-float 4s ease-in-out infinite",
        "vy-glow": "vy-glow 3s ease-in-out infinite",
        "vy-eq": "vy-eq 0.6s ease-in-out infinite alternate",
        "vy-ripple": "vy-ripple 1.8s ease-out infinite",
        "vy-beat": "vy-beat 1.6s ease-in-out infinite",
        "vy-spark": "vy-spark 1.6s ease-out infinite",
        "vy-dash": "vy-dash 1.6s ease-in-out infinite alternate",
        "vy-ring": "vy-ring 1.8s cubic-bezier(.3,.9,.3,1) forwards",
        "vy-live": "vy-live 1.6s ease-in-out infinite",
        "vy-scroll": "vy-scroll 1.8s ease-in-out infinite",
        "vy-shimmer": "vy-shimmer 1.6s ease-in-out infinite",
        "vy-orbit": "vy-orbit 2s linear infinite",
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
