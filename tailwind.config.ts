import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#0A0A0A',
          red: '#C0392B',
          'red-light': '#E74C3C',
          'red-dark': '#962d22',
          white: '#FFFFFF',
          gray: '#1A1A1A',
          'gray-light': '#2A2A2A',
          'gray-muted': '#888888',
        },
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0A0A0A 0%, #1a0505 50%, #0A0A0A 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
