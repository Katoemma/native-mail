<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

import { Bell, BellOff, LayoutList, PenLine, ShieldAlert, Smartphone } from '@lucide/vue'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { Identity } from '../../shared/types'
const SIGNATURE_MAX = 2047

const runtimeConfig = useRuntimeConfig()
const defaultLogoPath = computed(() =>
  (runtimeConfig.public.defaultSignatureLogo as string) || '/native-logo.png',
)
/** Absolute default so preview + email clients can load it */
const defaultLogoAbsolute = computed(() => {
  if (!import.meta.client) return defaultLogoPath.value
  const path = defaultLogoPath.value
  if (path.startsWith('http')) return path
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
})

const sessionStore = useSessionStore()
const { mode: mailLayoutMode } = useMailLayout()

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

// ── Signature (Stalwart Identity) ────────────────────────────────────────────
const identityId = ref<string | null>(null)
const signature = ref('')
const signatureSaved = ref('')
const logoUrl = ref('')
const logoUrlSaved = ref('')
const signatureLoading = ref(true)
const signatureSaving = ref(false)
const signatureError = ref<string | null>(null)
const signatureOk = ref(false)
const logoBroken = ref(false)

const signatureDirty = computed(() =>
  signature.value !== signatureSaved.value
  || logoUrl.value.trim() !== logoUrlSaved.value.trim(),
)
const signatureOverLimit = computed(() => signature.value.length > SIGNATURE_MAX)

const safeLogoUrl = computed(() => {
  const raw = logoUrl.value.trim()
  if (!raw) return ''
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return ''
    return u.toString()
  }
  catch {
    return ''
  }
})

const previewHtml = computed(() => {
  const parts: string[] = []
  const text = signature.value.trimEnd()
  if (text) {
    parts.push(
      text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r\n|\r|\n/g, '<br>'),
    )
  }
  const url = safeLogoUrl.value
  if (url && !logoBroken.value) {
    if (parts.length) parts.push('<br><br>')
    const safe = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    parts.push(
      `<img src="${safe}" alt="" width="120" style="max-width:120px;height:auto;display:block;border:0;">`,
    )
  }
  return parts.join('')
})

watch(logoUrl, () => { logoBroken.value = false })

async function loadIdentity() {
  signatureLoading.value = true
  signatureError.value = null
  try {
    const { identities } = await $fetch<{ identities: Identity[] }>('/api/identity')
    const primary = identities[0]
    identityId.value = primary?.id ?? null
    const text = primary?.textSignature ?? ''
    // Default to Native logo when none saved yet
    const logo = (primary?.logoUrl?.trim() || defaultLogoAbsolute.value)
    signature.value = text
    signatureSaved.value = text
    logoUrl.value = logo
    logoUrlSaved.value = logo
  }
  catch (err: unknown) {
    signatureError.value = err instanceof Error
      ? err.message
      : 'Failed to load signature'
  }
  finally {
    signatureLoading.value = false
  }
}

async function saveSignature() {
  if (signatureOverLimit.value || signatureSaving.value) return
  signatureSaving.value = true
  signatureError.value = null
  signatureOk.value = false
  try {
    const { identity } = await $fetch<{ identity: Identity }>('/api/identity', {
      method: 'PATCH',
      body: {
        identityId: identityId.value,
        textSignature: signature.value,
        logoUrl: logoUrl.value.trim(),
      },
    })
    identityId.value = identity.id
    signature.value = identity.textSignature ?? ''
    signatureSaved.value = signature.value
    logoUrl.value = identity.logoUrl ?? ''
    logoUrlSaved.value = logoUrl.value
    signatureOk.value = true
    setTimeout(() => { signatureOk.value = false }, 2000)
  }
  catch (err: unknown) {
    const msg = (err as { data?: { statusMessage?: string }; statusMessage?: string })
      ?.data?.statusMessage
      ?? (err as { statusMessage?: string })?.statusMessage
      ?? (err instanceof Error ? err.message : 'Failed to save signature')
    signatureError.value = msg
  }
  finally {
    signatureSaving.value = false
  }
}

onMounted(async () => {
  refreshStatus()
  void ensureEnabled()
  await loadIdentity()
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

      <!-- Display / layout — full controls live in Settings + Quick settings -->
      <section
        id="display"
        class="mb-6 scroll-mt-24 rounded-2xl border p-5 sm:p-6"
      >
        <div class="flex items-start gap-4">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <LayoutList class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-base font-semibold tracking-tight">
              Mail layout
            </h2>
            <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
              Currently using
              <span class="font-medium text-foreground">{{ mailLayoutMode === 'list' ? 'Default' : 'Split pane' }}</span>.
              Change it anytime from Settings or the gear icon in the header.
            </p>
            <Button
              variant="outline"
              class="mt-4"
              @click="navigateTo('/settings#layout')"
            >
              Open layout settings
            </Button>
          </div>
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

      <!-- Signature -->
      <section
        id="signature"
        class="mt-6 scroll-mt-24 rounded-2xl border p-5 sm:p-6"
      >
        <div class="flex items-start gap-4">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <PenLine class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-base font-semibold tracking-tight">
              Email signature
            </h2>
            <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
              Added at the end of new messages, replies, and forwards. Stored on your mail account.
            </p>

            <div v-if="signatureLoading" class="mt-4 h-28 animate-pulse rounded-xl bg-muted" />

            <template v-else>
              <label class="mt-4 block text-xs font-medium text-muted-foreground">
                Logo URL
                <input
                  v-model="logoUrl"
                  type="url"
                  inputmode="url"
                  :placeholder="defaultLogoAbsolute"
                  class="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
              </label>
              <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p class="text-[11px] leading-snug text-muted-foreground">
                  Defaults to the Native logo. Paste another https URL to change it.
                </p>
                <button
                  v-if="logoUrl.trim() !== defaultLogoAbsolute"
                  type="button"
                  class="text-[11px] font-medium text-primary hover:underline"
                  @click="logoUrl = defaultLogoAbsolute"
                >
                  Use Native logo
                </button>
              </div>

              <label class="mt-4 block text-xs font-medium text-muted-foreground">
                Signature text
                <textarea
                  v-model="signature"
                  rows="5"
                  maxlength="4096"
                  placeholder="Best regards,&#10;Your name"
                  class="mt-1.5 w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  :aria-invalid="signatureOverLimit"
                />
              </label>

              <div
                v-if="previewHtml"
                class="mt-4 rounded-xl border bg-muted/30 px-4 py-3"
              >
                <p class="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Preview
                </p>
                <div
                  class="text-sm leading-relaxed text-foreground [&_img]:mb-2"
                  v-html="previewHtml"
                />
              </div>
              <p
                v-if="logoUrl.trim() && logoBroken"
                class="mt-2 text-xs text-destructive"
              >
                Couldn’t load that image URL — check it’s public https.
              </p>
              <!-- Hidden probe so we know if the logo URL loads -->
              <img
                v-if="safeLogoUrl"
                :src="safeLogoUrl"
                alt=""
                class="pointer-events-none fixed size-0 opacity-0"
                @error="logoBroken = true"
                @load="logoBroken = false"
              >

              <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p
                  class="text-xs tabular-nums"
                  :class="signatureOverLimit ? 'text-destructive' : 'text-muted-foreground'"
                >
                  {{ signature.length }} / {{ SIGNATURE_MAX }}
                </p>
                <Button
                  type="button"
                  size="sm"
                  :disabled="!signatureDirty || signatureOverLimit || signatureSaving"
                  @click="saveSignature"
                >
                  {{ signatureSaving ? 'Saving…' : signatureOk ? 'Saved' : 'Save signature' }}
                </Button>
              </div>
              <p
                v-if="signatureError"
                class="mt-2 text-xs text-destructive"
              >
                {{ signatureError }}
              </p>
            </template>
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
