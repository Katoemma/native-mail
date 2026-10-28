<script setup lang="ts">
import logoUrl from '~/assets/images/logo.png'

defineProps<{
  open: boolean
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-500 ease-out"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[10000] flex flex-col bg-background"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading your inbox"
      >
        <div class="flex flex-1 flex-col items-center justify-center gap-8 px-6">
          <img
            :src="logoUrl"
            alt="Native"
            class="h-10 w-auto select-none sm:h-12"
            width="640"
            height="200"
            draggable="false"
          >
          <div class="flex flex-col items-center gap-3">
            <p class="text-sm tracking-wide text-muted-foreground">
              Native <span class="font-medium text-foreground/80">Mail</span>
            </p>
            <div class="h-0.5 w-40 overflow-hidden rounded-full bg-muted">
              <div class="mail-boot-bar h-full rounded-full bg-primary" />
            </div>
          </div>
        </div>

        <p class="absolute bottom-5 right-5 max-w-[min(100%-2.5rem,20rem)] text-right text-xs text-muted-foreground sm:bottom-6 sm:right-6">
          Having trouble loading?
          <NuxtLink
            to="/profile"
            class="text-primary underline-offset-2 hover:underline"
          >
            Open account settings
          </NuxtLink>
        </p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@keyframes mailBootBar {
  0% { transform: translateX(-100%); width: 40%; }
  50% { transform: translateX(80%); width: 55%; }
  100% { transform: translateX(260%); width: 40%; }
}

.mail-boot-bar {
  animation: mailBootBar 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
</style>
