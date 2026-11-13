/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Luxury Matte Obsidian palette ──
        obsidian: {
          DEFAULT: '#090C0E', // app background
          surface: '#11161A', // elevated panels / cards
          raised: '#141414', // gradient top stop (signature card)
          deep: '#070707',    // gradient bottom stop
          nav: '#0D1114',     // fixed bottom navigation
          void: '#050708',    // modal overlay
        },
        champagne: {
          DEFAULT: '#E5C158', // active indicator / accents
          foil: '#D4AF37',    // 24K gold trim / hairline accent
          dim: '#8A7327',
        },
        brushed: {
          emerald: '#064E3B', // Starter / Active card top stop
          emeraldDeep: '#022C22',
          slate: '#1E293B',   // mid-tier card top stop
          slateDeep: '#0F172A',
        },
      },
      borderColor: {
        hairline: 'rgba(255,255,255,0.08)',
        'hairline-gold': 'rgba(212,175,55,0.3)',
      },
      fontVariantNumeric: {
        numeric: 'tabular-nums',
      },
    },
  },
  plugins: [],
}
