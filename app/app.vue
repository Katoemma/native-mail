<script setup lang="ts">
import BootSplash from '@/components/BootSplash.vue'

const sessionStore = useSessionStore()

// The session plugin awaits fetchSession() before the app mounts.
const appReady = computed(() => sessionStore.initialized)
</script>

<template>
  <div class="contents">
    <NuxtRouteAnnouncer />

    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-500 ease-out"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <BootSplash
        v-if="!appReady"
        label="Checking your session"
      />
    </Transition>

    <!-- Keep mounted (invisible) so Pinia + layout pre-warm -->
    <div :class="appReady ? 'contents' : 'invisible pointer-events-none'">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
  </div>
</template>
