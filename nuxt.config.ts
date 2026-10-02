import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,   // SPA mode — no SSR flash, loading screen handles auth check
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
    jmapBaseUrl:      process.env.JMAP_BASE_URL      || 'https://mail.katoemma.website',
    sessionSecret:    process.env.SESSION_SECRET      || 'dev-secret-change-in-production-32b',
    // OAuth 2.0 client — server-side only
    oauthClientId:    process.env.OAUTH_CLIENT_ID     || 'native-mail',
    oauthClientSecret:process.env.OAUTH_CLIENT_SECRET || '',
    oauthRedirectUri: process.env.OAUTH_REDIRECT_URI  || 'http://localhost:3000/api/auth/callback',
    oauthScope:       process.env.OAUTH_SCOPE         || 'urn:ietf:params:jmap:core urn:ietf:params:jmap:mail urn:ietf:params:jmap:submission',
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