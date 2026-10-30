<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

import {
  Bell,
  Monitor,
  Moon,
  PenLine,
  Sun,
  UserRound,
} from '@lucide/vue'
import type { ThemePreference } from '~/composables/useTheme'

useHead({ title: 'Settings · Native Mail' })

const { preference, setPreference } = useTheme()

const themeOptions: { id: ThemePreference; label: string; hint: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', hint: 'Always use a light background.', icon: Sun },
  { id: 'dark', label: 'Dark', hint: 'Always use a dark background.', icon: Moon },
  { id: 'system', label: 'System', hint: 'Follow your device setting.', icon: Monitor },
]

const links = [
  {
    title: 'Account',
    description: 'Profile, display name, and session',
    to: '/profile',
    icon: UserRound,
  },
  {
    title: 'Notifications',
    description: 'Push alerts for new mail',
    to: '/profile#notifications',
    icon: Bell,
  },
  {
    title: 'Signature',
    description: 'Compose signature and logo',
    to: '/profile#signature',
    icon: PenLine,
  },
]
</script>

<template>
  <div class="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
    <header class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight">
        Settings
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Theme, account, and how Native Mail behaves.
      </p>
    </header>

    <section
      id="theme"
      class="mb-6 scroll-mt-24 rounded-2xl border p-5 sm:p-6"
    >
      <div class="flex items-start gap-4">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Moon class="size-5" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold tracking-tight">
            Theme
          </h2>
          <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
            Light, dark, or match your system preference.
          </p>
          <div class="mt-4 grid gap-2 sm:grid-cols-3">
            <button
              v-for="opt in themeOptions"
              :key="opt.id"
              type="button"
              class="flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors"
              :class="preference === opt.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border hover:bg-muted/40'"
              @click="setPreference(opt.id)"
            >
              <component
                :is="opt.icon"
                class="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <span>
                <span class="block text-sm font-medium">{{ opt.label }}</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">
                  {{ opt.hint }}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border p-5 sm:p-6">
      <h2 class="text-base font-semibold tracking-tight">
        More
      </h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Account details live on your profile.
      </p>
      <ul class="mt-4 divide-y rounded-xl border">
        <li v-for="item in links" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/40"
          >
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <component :is="item.icon" class="size-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium">{{ item.title }}</span>
              <span class="block text-xs text-muted-foreground">{{ item.description }}</span>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
