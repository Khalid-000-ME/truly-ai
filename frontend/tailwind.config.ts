import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'space-grotesk': ['var(--font-space-grotesk)', 'sans-serif'],
        'unbounded': ['var(--font-unbounded)', 'sans-serif'],
        'mono': ['var(--font-ibm-plex-mono)', 'monospace'],
        'instrument': ['var(--font-instrument)', 'sans-serif'],
        'inter': ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        'brutal-pink': '#FF006E',
        'brutal-blue': '#3A86FF',
        'brutal-lime': '#8AC926',
        'brutal-yellow': '#FFBE0B',
        'brutal-black': '#000000',
        'brutal-white': '#F8F9FA',
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px #000',
        'brutal-lg': '6px 6px 0px 0px #000',
        'brutal-xl': '8px 8px 0px 0px #000',
        'brutal-hover': '6px 6px 0px 0px #000',
        'brutal-active': '2px 2px 0px 0px #000',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '5': '5px',
        '6': '6px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'brutal-bounce': 'brutal-bounce 0.3s ease-in-out',
      },
      keyframes: {
        'brutal-bounce': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(2px, 2px)' },
        }
      }
    },
  },
  plugins: [],
};

export default config;
