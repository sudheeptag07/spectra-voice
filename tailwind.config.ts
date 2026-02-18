import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Avenir Next', 'Avenir', 'Segoe UI', 'sans-serif'],
        display: ['Gill Sans', 'Trebuchet MS', 'sans-serif']
      },
      colors: {
        spectra: {
          bg: '#0b1020',
          panel: 'rgba(17, 25, 40, 0.68)',
          edge: 'rgba(101, 129, 255, 0.25)',
          accent: '#5eead4',
          warning: '#facc15',
          success: '#22c55e',
          danger: '#f43f5e'
        }
      },
      boxShadow: {
        glass: '0 24px 64px rgba(11, 16, 32, 0.45)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
};

export default config;
