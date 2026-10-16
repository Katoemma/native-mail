<script setup lang="ts">
import { ArrowRight, Loader2, ShieldCheck } from '@lucide/vue'
import logoUrl from '~/assets/images/logo.png'

definePageMeta({ layout: false })

useHead({
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap',
    },
  ],
})

const sessionStore = useSessionStore()
const route = useRoute()

const oauthError = computed(() => route.query.error as string | undefined)
const ready = ref(false)

onMounted(async () => {
  requestAnimationFrame(() => { ready.value = true })
  await sessionStore.fetchSession()
  if (sessionStore.loggedIn) await navigateTo('/mail/inbox')
})
</script>

<template>
  <div class="login-page relative min-h-svh overflow-hidden">
    <!-- Atmosphere -->
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div class="login-wash absolute inset-0" />
      <div class="login-grid absolute inset-0 opacity-[0.35]" />
      <div class="login-orb login-orb-a absolute -top-24 -right-16 size-[28rem] rounded-full" />
      <div class="login-orb login-orb-b absolute -bottom-32 -left-20 size-[24rem] rounded-full" />
      <svg
        class="login-envelope absolute right-[8%] top-1/2 hidden w-[min(42vw,28rem)] -translate-y-1/2 text-primary/10 lg:block"
        viewBox="0 0 320 240" fill="none">
        <rect x="24" y="48" width="272" height="160" rx="18" stroke="currentColor" stroke-width="2" />
        <path d="M24 68 L160 148 L296 68" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        <circle cx="248" cy="168" r="6" fill="currentColor" opacity="0.35" />
        <circle cx="268" cy="168" r="6" fill="currentColor" opacity="0.22" />
        <circle cx="288" cy="168" r="6" fill="currentColor" opacity="0.12" />
      </svg>
    </div>

    <div class="relative z-10 flex min-h-svh flex-col items-center justify-center px-6 py-12">
      <div :class="[
        'w-full max-w-md transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
        ready ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
      ]">
        <!-- Brand lockup -->
        <div class="mb-10 flex flex-col items-center text-center">
          <div
            :class="[
              'w-full max-w-[300px] sm:max-w-[340px]',
              'transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
              ready ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
            ]"
          >
            <img
              :src="logoUrl"
              alt="Native"
              class="mx-auto h-12 w-auto max-w-full object-contain sm:h-14"
              width="640"
              height="200"
            >
          </div>
          <h1 class="sr-only">Native Mail</h1>
          <p class="mt-5 max-w-xs text-[0.95rem] leading-relaxed text-muted-foreground">
            Secure mail for your day — powered by Stalwart.
          </p>
        </div>

        <!-- Error -->
        <div v-if="oauthError"
          class="mb-5 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
          role="alert">
          <p class="font-semibold">Authentication failed</p>
          <p class="mt-0.5 opacity-80">{{ oauthError }}</p>
        </div>

        <!-- Sign-in interaction -->
        <div class="login-panel rounded-2xl border border-border/80 bg-background/80 p-6 backdrop-blur-md sm:p-7">
          <div class="mb-6 space-y-1.5">
            <h2 class="login-brand text-lg font-semibold tracking-tight text-foreground">
              Sign in to your mailbox
            </h2>
            <p class="text-sm leading-relaxed text-muted-foreground">
              You’ll authenticate on the mail server. Your password never touches this app.
            </p>
          </div>

          <button type="button"
            class="login-cta group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] duration-150 ease-out hover:opacity-95 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            :disabled="sessionStore.loading" @click="sessionStore.startOAuth()">
            <Loader2 v-if="sessionStore.loading" class="size-4 animate-spin" />
            <template v-else>
              <span>Continue securely</span>
              <ArrowRight
                class="size-4 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5"
                :stroke-width="2" />
            </template>
          </button>

          <div class="mt-5 flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck class="mt-0.5 size-3.5 shrink-0 text-primary" :stroke-width="2" />
            <p>OAuth 2.0 + PKCE — credentials stay with the mail server.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-brand {
  font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
}

.login-wash {
  background:
    radial-gradient(120% 80% at 10% -10%, color-mix(in oklch, var(--primary) 16%, transparent), transparent 55%),
    radial-gradient(90% 70% at 100% 100%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 50%),
    linear-gradient(180deg, oklch(0.985 0.005 30) 0%, oklch(0.97 0.01 30) 100%);
}

.login-grid {
  background-image:
    linear-gradient(to right, color-mix(in oklch, var(--foreground) 5%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 5%, transparent) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent);
}

.login-orb {
  filter: blur(64px);
  opacity: 0.45;
}

.login-orb-a {
  background: color-mix(in oklch, var(--primary) 35%, transparent);
  animation: loginFloat 12s ease-in-out infinite;
}

.login-orb-b {
  background: color-mix(in oklch, var(--primary) 22%, oklch(0.85 0.04 60));
  animation: loginFloat 16s ease-in-out infinite reverse;
}

.login-envelope {
  animation: loginFloat 14s ease-in-out infinite;
}

.login-panel {
  box-shadow:
    0 1px 0 color-mix(in oklch, white 70%, transparent) inset,
    0 18px 40px -28px color-mix(in oklch, var(--foreground) 28%, transparent);
}

.login-cta::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, color-mix(in oklch, white 22%, transparent) 50%, transparent 70%);
  transform: translateX(-120%);
  transition: transform 0.55s cubic-bezier(0.23, 1, 0.32, 1);
}

.login-cta:hover::after {
  transform: translateX(120%);
}

@keyframes loginFloat {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-12px);
  }
}

@media (prefers-reduced-motion: reduce) {

  .login-orb-a,
  .login-orb-b,
  .login-envelope {
    animation: none;
  }

  .login-cta::after {
    display: none;
  }
}
</style>
