import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,   // SPA mode — no SSR flash, loading screen handles auth check
  css: ['~/assets/css/main.css'],

  // Browser chrome (mobile status bar, PWA) — matches --primary in main.css
  app: {
    head: {
      title: 'Native Mail',
      meta: [
        { name: 'theme-color', content: '#f71212' },
        { name: 'msapplication-TileColor', content: '#f71212' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Native Mail' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },

  vite: {
    plugins: [
      tailwindcss(),
    ]
  },

  modules: ["shadcn-nuxt", "@vueuse/nuxt", "@pinia/nuxt", "@vite-pwa/nuxt"],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Native Mail',
      short_name: 'Native Mail',
      description: 'Secure mail for your day',
      theme_color: '#f71212',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'any',
      start_url: '/mail/inbox',
      scope: '/',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,ico,svg,woff2}'],
      // API / auth / WS stay network-only (don't cache mail data offline)
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\/api\/.*/i,
          handler: 'NetworkOnly',
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },

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