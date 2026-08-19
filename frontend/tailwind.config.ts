// Tailwind CSS configuration for the frontend app.
// Scans the app/ and components/ directories for class names and extends the
// default theme with the brand green palette used throughout the UI (buttons,
// selected states, badges).

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          green: '#00A36C',
          lightGreen: '#E8F5E9',
        },
      },
    },
  },
  plugins: [],
};

export default config;
