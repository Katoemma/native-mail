<script setup lang="ts">
const sessionStore = useSessionStore()

// The session plugin awaits fetchSession() before the app mounts.
// sessionStore.initialized flips to true when that completes.
const appReady = computed(() => sessionStore.loggedIn)
</script>

<template>
  <div class="contents">
    <NuxtRouteAnnouncer />

    <!-- ── Full-screen loading ─────────────────────────────────────────── -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-500"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="!appReady"
        class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background gap-6"
      >
        <!-- Logo -->
        <div class="relative flex items-center justify-center">
          <div
            class="absolute size-20 rounded-3xl bg-primary/15 animate-ping"
            style="animation-duration: 1.8s;"
          />
          <div class="relative size-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
            <svg
              class="size-8 text-primary-foreground"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
        </div>

        <!-- Name + status -->
        <div class="text-center space-y-1.5">
          <h1 class="text-2xl font-semibold tracking-tight text-foreground">Native Mail</h1>
          <p class="text-sm text-muted-foreground">Checking your session…</p>
        </div>

        <!-- Animated loading bar -->
        <div class="w-48 h-0.5 rounded-full bg-muted overflow-hidden">
          <div class="h-full bg-primary rounded-full loading-bar" />
        </div>
      </div>
    </Transition>

    <!-- ── App ─────────────────────────────────────────────────────────── -->
    <!-- Keep invisible (not unmounted) so Pinia state + layout pre-warm -->
    <div :class="appReady ? 'contents' : 'invisible pointer-events-none'">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
  </div>
</template>

<style>
@keyframes loadingBar {
  0%   { transform: translateX(-100%); width: 45%; }
  50%  { transform: translateX(120%);  width: 65%; }
  100% { transform: translateX(260%);  width: 45%; }
}

.loading-bar {
  animation: loadingBar 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
</style>
