<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

import {
  Bell,
  LayoutList,
  PanelsTopLeft,
  PenLine,
  UserRound,
} from '@lucide/vue'
import type { MailLayoutMode } from '~/composables/useMailLayout'

useHead({ title: 'Settings · Native Mail' })

const { mode, setMode } = useMailLayout()

function onLayoutPick(next: MailLayoutMode) {
  setMode(next)
}

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
        Layout, account, and how Native Mail behaves.
      </p>
    </header>

    <section
      id="layout"
      class="mb-6 scroll-mt-24 rounded-2xl border p-5 sm:p-6"
    >
      <div class="flex items-start gap-4">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <LayoutList class="size-5" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold tracking-tight">
            Inbox layout
          </h2>
          <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
            Choose how mail is arranged on desktop. Mobile always uses a full-width list.
          </p>
          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              class="flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors"
              :class="mode === 'list'
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border hover:bg-muted/40'"
              @click="onLayoutPick('list')"
            >
              <LayoutList class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                <span class="block text-sm font-medium">Default</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">
                  Full-width inbox; open a message to read.
                </span>
              </span>
            </button>
            <button
              type="button"
              class="flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors"
              :class="mode === 'split'
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border hover:bg-muted/40'"
              @click="onLayoutPick('split')"
            >
              <PanelsTopLeft class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                <span class="block text-sm font-medium">Split pane</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">
                  List beside the reading pane.
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
