<script setup lang="ts">
import { LayoutList, Moon, PanelsTopLeft, Sun, Monitor } from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { MailLayoutMode } from '~/composables/useMailLayout'
import type { ThemePreference } from '~/composables/useTheme'

const open = defineModel<boolean>('open', { default: false })

const { mode, setMode } = useMailLayout()
const { preference, setPreference } = useTheme()

function pick(next: MailLayoutMode) {
  setMode(next)
}

function pickTheme(next: ThemePreference) {
  setPreference(next)
}

function goAllSettings() {
  open.value = false
  void navigateTo('/settings')
}

const themeOptions: { id: ThemePreference; label: string; hint: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', hint: 'Always light', icon: Sun },
  { id: 'dark', label: 'Dark', hint: 'Always dark', icon: Moon },
  { id: 'system', label: 'System', hint: 'Match device', icon: Monitor },
]
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent
      side="right"
      class="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
    >
      <SheetHeader class="space-y-0 border-b px-4 py-3.5 pr-12 text-left">
        <SheetTitle class="text-base font-medium">
          Quick settings
        </SheetTitle>
        <SheetDescription class="sr-only">
          Change theme, mail layout, and open full settings
        </SheetDescription>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto px-4 py-4">
        <button
          type="button"
          class="mb-6 flex h-11 w-full items-center justify-center rounded-full border border-primary/40 bg-background text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          @click="goAllSettings"
        >
          See all settings
        </button>

        <section class="mb-6">
          <h3 class="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Theme
          </h3>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in themeOptions"
              :key="opt.id"
              type="button"
              class="flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors"
              :class="preference === opt.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                : 'border-border hover:bg-muted/40'"
              @click="pickTheme(opt.id)"
            >
              <component
                :is="opt.icon"
                class="size-4 text-muted-foreground"
                :stroke-width="1.75"
              />
              <span class="text-xs font-medium">{{ opt.label }}</span>
            </button>
          </div>
        </section>

        <section>
          <h3 class="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Inbox layout
          </h3>
          <div class="flex flex-col gap-2">
            <button
              type="button"
              class="flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors"
              :class="mode === 'list'
                ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                : 'border-border hover:bg-muted/40'"
              @click="pick('list')"
            >
              <span
                class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border"
                :class="mode === 'list' ? 'border-primary' : 'border-muted-foreground/40'"
              >
                <span
                  v-if="mode === 'list'"
                  class="size-2 rounded-full bg-primary"
                />
              </span>
              <LayoutList class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span class="min-w-0">
                <span class="block text-sm font-medium">Default</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">
                  Full-width list — open a message to read (Gmail-style).
                </span>
              </span>
            </button>

            <button
              type="button"
              class="flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors"
              :class="mode === 'split'
                ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                : 'border-border hover:bg-muted/40'"
              @click="pick('split')"
            >
              <span
                class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border"
                :class="mode === 'split' ? 'border-primary' : 'border-muted-foreground/40'"
              >
                <span
                  v-if="mode === 'split'"
                  class="size-2 rounded-full bg-primary"
                />
              </span>
              <PanelsTopLeft class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span class="min-w-0">
                <span class="block text-sm font-medium">Split pane</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">
                  Message list beside the reading pane.
                </span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </SheetContent>
  </Sheet>
</template>
