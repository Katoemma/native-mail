<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

import { Bell, BellOff, ShieldAlert, Smartphone } from '@lucide/vue'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'

const sessionStore = useSessionStore()
const {
  status,
  enabled,
  busy,
  error,
  iosNeedsInstall,
  enable,
  disable,
  ensureEnabled,
  refreshStatus,
} = useWebPush()

const user = computed(() => ({
  name: sessionStore.displayName || sessionStore.username || 'User',
  email: sessionStore.email || sessionStore.username || '',
  avatar: '',
}))

const initials = computed(() => {
  const label = (user.value.name || user.value.email || 'U').trim()
  const parts = label.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return label.slice(0, 2).toUpperCase() || 'U'
})

const switchDisabled = computed(() =>
  busy.value || status.value === 'denied' || status.value === 'unsupported',
)

const statusCopy = computed(() => {
  switch (status.value) {
    case 'enabled':
      return 'You’ll get alerts for new inbox mail, even when Native Mail is closed.'
    case 'denied':
      return 'Notifications are blocked in this browser. Allow them in site settings, then turn the switch back on.'
    case 'unsupported':
      return iosNeedsInstall.value
        ? 'On iPhone and iPad, add Native Mail to your Home Screen first, then enable notifications.'
        : 'This browser doesn’t support push notifications.'
    case 'default':
      return 'Allow the browser prompt so we can notify you about new mail.'
    default:
      return 'Turn on to get notified when new mail arrives in your inbox.'
  }
})

async function onNotifyChange(checked: boolean) {
  if (checked) await enable()
  else await disable()
  refreshStatus()
}

onMounted(async () => {
  refreshStatus()
  // Default ON — enable unless the user previously opted out
  await ensureEnabled()
})
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-10">
      <!-- Identity -->
      <section class="mb-10 flex items-start gap-4 sm:gap-5">
        <Avatar class="size-16 rounded-2xl sm:size-20">
          <AvatarImage :src="user.avatar" :alt="user.name" />
          <AvatarFallback class="rounded-2xl text-lg font-semibold sm:text-xl">
            {{ initials }}
          </AvatarFallback>
        </Avatar>
        <div class="min-w-0 flex-1 pt-1">
          <h1 class="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
            {{ user.name }}
          </h1>
          <p class="mt-1 truncate text-sm text-muted-foreground">
            {{ user.email }}
          </p>
          <p class="mt-3 text-sm text-muted-foreground">
            Manage how Native Mail reaches you.
          </p>
        </div>
      </section>

      <!-- Notifications -->
      <section
        id="notifications"
        class="scroll-mt-24 rounded-2xl border bg-muted/20 p-5 sm:p-6"
      >
        <div class="flex items-start gap-4">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-xl"
            :class="enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
          >
            <Bell v-if="enabled" class="size-5" />
            <BellOff v-else class="size-5" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h2 class="text-base font-semibold tracking-tight">
                  Email notifications
                </h2>
                <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {{ statusCopy }}
                </p>
              </div>
              <Switch
                :checked="enabled"
                :disabled="switchDisabled"
                class="mt-0.5"
                aria-label="Email notifications"
                @update:checked="onNotifyChange"
              />
            </div>

            <p
              v-if="error"
              class="mt-3 text-xs leading-snug text-destructive"
            >
              {{ error }}
            </p>

            <div
              v-if="iosNeedsInstall"
              class="mt-4 flex items-start gap-2.5 rounded-xl border border-border/80 bg-background px-3.5 py-3 text-xs text-muted-foreground"
            >
              <Smartphone class="mt-0.5 size-3.5 shrink-0" />
              <span>
                Install Native Mail from Share → Add to Home Screen, open it from there, then enable notifications.
              </span>
            </div>

            <div
              v-else-if="status === 'denied'"
              class="mt-4 flex items-start gap-2.5 rounded-xl border border-border/80 bg-background px-3.5 py-3 text-xs text-muted-foreground"
            >
              <ShieldAlert class="mt-0.5 size-3.5 shrink-0" />
              <span>
                Open your browser’s site settings for this address and set Notifications to Allow.
              </span>
            </div>

            <p
              v-if="busy"
              class="mt-3 text-xs text-muted-foreground"
            >
              Updating…
            </p>
          </div>
        </div>
      </section>

      <!-- Account (read-only for now) -->
      <section class="mt-6 rounded-2xl border p-5 sm:p-6">
        <h2 class="text-base font-semibold tracking-tight">
          Account
        </h2>
        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex items-baseline justify-between gap-4">
            <dt class="text-muted-foreground">Display name</dt>
            <dd class="truncate font-medium text-foreground">{{ user.name }}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-4 border-t pt-3">
            <dt class="text-muted-foreground">Email</dt>
            <dd class="truncate font-medium text-foreground">{{ user.email }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>
