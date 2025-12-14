/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "score-pop": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
        "score-flash": {
          "0%": { backgroundColor: "rgb(34 197 94 / 0.5)" },
          "100%": { backgroundColor: "transparent" },
        },
        "score-up": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-20px)", opacity: "0" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 5px currentColor" },
          "50%": { boxShadow: "0 0 20px currentColor, 0 0 30px currentColor" },
        },
        // Touchdown animation - big celebratory effect
        "td-explode": {
          "0%": { transform: "scale(1)", filter: "brightness(1)" },
          "25%": { transform: "scale(1.5)", filter: "brightness(1.5)" },
          "50%": { transform: "scale(1.2)", filter: "brightness(1.2)" },
          "75%": { transform: "scale(1.4)", filter: "brightness(1.3)" },
          "100%": { transform: "scale(1)", filter: "brightness(1)" },
        },
        // Field goal animation - smooth arc motion
        "fg-arc": {
          "0%": { transform: "scale(1) translateY(0)" },
          "50%": { transform: "scale(1.2) translateY(-10px)" },
          "100%": { transform: "scale(1) translateY(0)" },
        },
        // Safety animation - shake effect
        "safety-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-3px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(3px)" },
        },
        // PAT/2PT animation - quick bump
        "pat-bump": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
        // Score label float up
        "label-float": {
          "0%": { transform: "translateY(0) scale(0.5)", opacity: "0" },
          "20%": { transform: "translateY(-15px) scale(1.2)", opacity: "1" },
          "100%": { transform: "translateY(-40px) scale(1)", opacity: "0" },
        },
        // Firework burst for TDs
        "firework": {
          "0%": { transform: "scale(0)", opacity: "1" },
          "50%": { transform: "scale(1.5)", opacity: "0.8" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
        // Timeout used - fade out and grow
        "timeout-used": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "score-pop": "score-pop 0.4s ease-out",
        "score-flash": "score-flash 0.6s ease-out",
        "score-up": "score-up 0.8s ease-out forwards",
        "bounce-in": "bounce-in 0.5s ease-out",
        "glow": "glow 1s ease-in-out infinite",
        "td-explode": "td-explode 0.8s ease-out",
        "fg-arc": "fg-arc 0.5s ease-out",
        "safety-shake": "safety-shake 0.5s ease-out",
        "pat-bump": "pat-bump 0.3s ease-out",
        "label-float": "label-float 1.2s ease-out forwards",
        "firework": "firework 0.8s ease-out forwards",
        "timeout-used": "timeout-used 1.5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
