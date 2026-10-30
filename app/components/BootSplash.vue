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
          class="ldr-envelope mt-8 sm:mt-10"
          style="--ldr-size: 88px; --ldr-color: var(--primary)"
          aria-hidden="true"
        >
          <span class="ldr-envelope-body">
            <span class="ldr-envelope-letter" />
            <span class="ldr-envelope-pocket" />
            <span class="ldr-envelope-flap" />
          </span>
        </div>
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

.ldr-envelope {
  --s: var(--ldr-size, 48px);
  --c: var(--ldr-color, var(--primary));
  position: relative;
  width: var(--s);
  height: var(--s);
}
.ldr-envelope-body {
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: 14%;
  height: 54%;
  border-radius: calc(var(--s) / 20);
  background: color-mix(in srgb, var(--c) 30%, transparent);
  animation: ldr-envelope-send 2.4s infinite;
}
.ldr-envelope-letter {
  position: absolute;
  z-index: 1;
  left: 12%;
  right: 12%;
  top: 8%;
  height: 80%;
  box-sizing: border-box;
  border: calc(var(--s) / 40) solid var(--c);
  border-radius: calc(var(--s) / 40);
  background:
    repeating-linear-gradient(to bottom, var(--c) 0 calc(var(--s) / 30), transparent 0 calc(var(--s) * 0.08)) 50% 30% / 64% 36% no-repeat,
    color-mix(in srgb, var(--c) 10%, var(--background, #fff));
  animation: ldr-envelope-letter 2.4s infinite;
}
.ldr-envelope-pocket {
  position: absolute;
  z-index: 2;
  inset: 0;
  border-radius: calc(var(--s) / 20);
  background: var(--c);
  clip-path: polygon(0 0, 50% 58%, 100% 0, 100% 100%, 0 100%);
}
.ldr-envelope-flap {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 62%;
  background: color-mix(in srgb, var(--c) 72%, #000);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  transform-origin: 50% 0;
  animation: ldr-envelope-flap 2.4s infinite;
}
@keyframes ldr-envelope-letter {
  0%   { transform: translateY(-70%); opacity: 0; }
  10%  { transform: translateY(-70%); opacity: 1; animation-timing-function: cubic-bezier(0.5, 0, 0.3, 1); }
  36%  { transform: translateY(6%); opacity: 1; }
  58%  { transform: translateY(6%); opacity: 1; }
  60%  { transform: translateY(6%); opacity: 0; }
  100% { transform: translateY(-70%); opacity: 0; }
}
@keyframes ldr-envelope-flap {
  0%, 38%   { transform: scaleY(-1); z-index: 0; animation-timing-function: cubic-bezier(0.5, 0, 0.3, 1); }
  39%       { z-index: 3; }
  48%, 84%  { transform: scaleY(1); z-index: 3; animation-timing-function: cubic-bezier(0.5, 0, 0.3, 1); }
  93%, 100% { transform: scaleY(-1); z-index: 0; }
}
@keyframes ldr-envelope-send {
  0%, 50%   { transform: translate(0, 0) rotate(0); }
  56%       { transform: translate(0, calc(var(--s) * 0.03)) rotate(0); }
  64%       { transform: translate(calc(var(--s) * 0.04), calc(var(--s) * -0.1)) rotate(-6deg); }
  74%, 100% { transform: translate(0, 0) rotate(0); }
}

@media (prefers-reduced-motion: reduce) {
  .boot-logo {
    animation: none;
  }
  .ldr-envelope,
  .ldr-envelope-body,
  .ldr-envelope-letter,
  .ldr-envelope-flap {
    animation-duration: 3s;
  }
}
</style>


