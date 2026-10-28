<script setup lang="ts">
import logoUrl from '~/assets/images/logo.png'

const sessionStore = useSessionStore()

// The session plugin awaits fetchSession() before the app mounts.
// sessionStore.initialized flips to true when that completes.
const appReady = computed(() => sessionStore.initialized)
</script>

<template>
  <div class="contents">
    <NuxtRouteAnnouncer />

    <!-- ── Boot splash (session) — Gmail-style centered brand ───────────── -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-500 ease-out"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="!appReady"
        class="fixed inset-0 z-[9999] flex flex-col bg-background"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Checking your session"
      >
        <div class="flex flex-1 flex-col items-center justify-center gap-7 px-6">
          <img
            :src="logoUrl"
            alt="Native"
            class="h-9 w-auto select-none sm:h-11"
            width="640"
            height="200"
            draggable="false"
          >
          <p class="text-sm tracking-wide text-muted-foreground">
            Native <span class="font-medium text-foreground/80">Mail</span>
          </p>
          <div class="h-0.5 w-36 overflow-hidden rounded-full bg-muted">
            <div class="h-full rounded-full bg-primary loading-bar" />
          </div>
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
  0%   { transform: translateX(-100%); width: 40%; }
  50%  { transform: translateX(80%);  width: 55%; }
  100% { transform: translateX(260%); width: 40%; }
}

.loading-bar {
  animation: loadingBar 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
</style>
