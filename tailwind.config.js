/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
        },
        '.scrollbar-thumb-gray-600': {
          'scrollbar-color': '#4B5563 transparent',
        },
        '.scrollbar-track-gray-800': {
          'scrollbar-color': '#4B5563 #1F2937',
        },
        '.hover\\:scrollbar-thumb-gray-500:hover': {
          'scrollbar-color': '#6B7280 transparent',
        },
        // Webkit scrollbar styles
        '.scrollbar-thin::-webkit-scrollbar': {
          width: '6px',
        },
        '.scrollbar-thin::-webkit-scrollbar-track': {
          background: '#1F2937',
          borderRadius: '3px',
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb': {
          background: '#4B5563',
          borderRadius: '3px',
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb:hover': {
          background: '#6B7280',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}
