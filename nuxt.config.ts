import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [
      tailwindcss(),
    ]
  },

  modules: ["shadcn-nuxt", "@vueuse/nuxt", "@pinia/nuxt"],

  shadcn: {
    prefix: '',
    componentDir: '@/components/ui'
  },

  runtimeConfig: {
    // Server-only — never exposed to the browser
    jmapBaseUrl: process.env.JMAP_BASE_URL || 'https://mail.katoemma.website',
    sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production-32b',
    // Public (safe to expose)
    public: {
      appName: 'Native Mail',
    },
  },

  nitro: {
    experimental: {
      websocket: true,
    },
  },
});