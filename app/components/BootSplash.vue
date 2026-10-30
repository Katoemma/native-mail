<script setup lang="ts">
import logoUrl from '~/assets/images/logo.png'

withDefaults(defineProps<{
  /** Accessible status label */
  label?: string
  /** Optional bottom-right help (onboarding only) */
  showHelp?: boolean
}>(), {
  label: 'Loading',
  showHelp: false,
})
</script>

<template>
  <div
    class="boot-splash fixed inset-0 z-[10000] flex flex-col bg-background"
    role="status"
    aria-live="polite"
    aria-busy="true"
    :aria-label="label"
  >
    <div class="flex flex-1 flex-col items-center justify-center px-6">
      <div class="boot-mark flex flex-col items-center">
        <img
          :src="logoUrl"
          alt="Native"
          class="boot-logo h-11 w-auto select-none sm:h-14"
          width="640"
          height="200"
          draggable="false"
        >

        <p class="boot-product mt-5 text-[0.8125rem] text-muted-foreground sm:mt-6 sm:text-sm">
          Mail
        </p>

        <div
          class="boot-loader mt-8 sm:mt-10"
          aria-hidden="true"
        />
      </div>
    </div>

    <p
      v-if="showHelp"
      class="absolute bottom-5 right-5 max-w-[min(100%-2.5rem,18rem)] text-right text-[11px] leading-relaxed text-muted-foreground/80 sm:bottom-7 sm:right-7 sm:text-xs"
    >
      Having trouble loading?
      <NuxtLink
        to="/profile"
        class="text-foreground/70 underline decoration-border underline-offset-2 transition-colors hover:text-primary hover:decoration-primary"
      >
        Account settings
      </NuxtLink>
    </p>
  </div>
</template>

<style scoped>
.boot-product {
  font-family: 'Libre Baskerville', 'Times New Roman', Times, serif;
  font-style: italic;
  letter-spacing: 0.28em;
  text-indent: 0.28em; /* optical center with letter-spacing */
  text-transform: lowercase;
  font-weight: 400;
}

.boot-logo {
  animation: bootBreathe 2.8s ease-in-out infinite;
}

@keyframes bootBreathe {
  0%, 100% { opacity: 1; transform: translateY(0); }
  50% { opacity: 0.88; transform: translateY(-1px); }
}

.boot-loader {
  width: 40px;
  aspect-ratio: 1;
  color: var(--primary);
  position: relative;
  background: radial-gradient(10px, currentColor 94%, #0000);
}

.boot-loader::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(9px at bottom right, #0000 94%, currentColor) top left,
    radial-gradient(9px at bottom left, #0000 94%, currentColor) top right,
    radial-gradient(9px at top right, #0000 94%, currentColor) bottom left,
    radial-gradient(9px at top left, #0000 94%, currentColor) bottom right;
  background-size: 20px 20px;
  background-repeat: no-repeat;
  animation: bootOrb 1.5s infinite cubic-bezier(0.3, 1, 0, 1);
}

@keyframes bootOrb {
  33% { inset: -10px; transform: rotate(0deg); }
  66% { inset: -10px; transform: rotate(90deg); }
  100% { inset: 0; transform: rotate(90deg); }
}

@media (prefers-reduced-motion: reduce) {
  .boot-logo,
  .boot-loader::before {
    animation: none;
  }
}
</style>

