<script setup lang="ts">
import { X, Minus, Plus, Send, Paperclip, Loader2, ChevronDown } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'

const composer = useComposerStore()
const isMobile = useMediaQuery('(max-width: 768px)')

// Address input helpers
const toInput = ref('')
const ccInput = ref('')
const showCc = ref(false)

function addAddress(field: 'to' | 'cc' | 'bcc', raw: string) {
  const email = raw.trim()
  if (!email) return
  const existing = composer[field]
  if (!existing.find(a => a.email === email)) {
    composer[field] = [...existing, { email }]
  }
}

function removeAddress(field: 'to' | 'cc' | 'bcc', email: string) {
  composer[field] = composer[field].filter(a => a.email !== email)
}

function onToKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addAddress('to', toInput.value)
    toInput.value = ''
  }
}

function onCcKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addAddress('cc', ccInput.value)
    ccInput.value = ''
  }
}

// Auto-save debounce — never fire after close/send/$reset (that created empty drafts)
let saveTimer: ReturnType<typeof setTimeout> | undefined
function clearAutosave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = undefined
}
watch([() => composer.body, () => composer.subject], () => {
  clearAutosave()
  if (!composer.open || composer.sending) return
  saveTimer = setTimeout(() => {
    if (!composer.open || composer.sending) return
    void composer.saveDraft()
  }, 3000)
})
onUnmounted(() => clearAutosave())

// File picker
const fileInput = ref<HTMLInputElement | null>(null)
function pickFile() { fileInput.value?.click() }
async function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  for (const file of Array.from(files)) {
    await composer.addAttachment(file)
  }
  if (fileInput.value) fileInput.value.value = ''
}

// Desktop window chrome: normal | minimised | maximised
type ComposeWindowMode = 'normal' | 'minimised' | 'maximised'
const windowMode = ref<ComposeWindowMode>('normal')
const isMinimised = computed(() => windowMode.value === 'minimised')
const isMaximised = computed(() => windowMode.value === 'maximised')

watch(() => composer.open, (open) => {
  if (open) {
    windowMode.value = 'normal'
  }
  else {
    clearAutosave()
  }
})
watch(() => composer.sending, (sending) => {
  if (sending) clearAutosave()
})

// On mobile, never keep a floating window mode
watch(isMobile, (mobile) => {
  if (mobile) windowMode.value = 'normal'
})

function minimiseComposer() {
  windowMode.value = 'minimised'
}

function maximiseComposer() {
  windowMode.value = 'maximised'
}

function restoreComposer() {
  windowMode.value = 'normal'
}

function onTitlebarClick() {
  if (isMobile.value) return
  if (isMinimised.value) restoreComposer()
  else minimiseComposer()
}

function closeComposer() {
  windowMode.value = 'normal'
  composer.close()
}
</script>

<template>
  <Teleport to="body">
    <!-- Mobile backdrop -->
    <div
      v-if="composer.open && isMobile"
      class="fixed inset-0 z-40 bg-black/40 md:hidden"
      aria-hidden="true"
      @click="closeComposer"
    />

    <div
      v-if="composer.open"
      role="dialog"
      aria-modal="true"
      aria-label="Compose message"
      :class="[
        'fixed z-50 flex flex-col bg-background transition-[transform,opacity,width,height] duration-200 ease-out',
        // Mobile: full screen sheet
        isMobile
          ? 'inset-0 h-dvh w-full rounded-none border-0 shadow-none'
          : isMinimised
            ? 'bottom-0 right-6 h-12 w-72 rounded-t-xl border shadow-2xl'
            : isMaximised
              ? 'inset-3 rounded-xl border shadow-2xl'
              : 'bottom-0 right-6 h-[min(520px,85dvh)] w-[min(560px,calc(100vw-2rem))] rounded-t-xl border shadow-2xl',
      ]"
    >
      <!-- Header -->
      <div
        :class="[
          'flex shrink-0 items-center gap-2 border-b bg-muted/50 select-none',
          isMobile
            ? 'px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]'
            : [
                'group/titlebar cursor-pointer px-3.5 py-2.5',
                isMaximised ? 'rounded-t-xl' : 'rounded-t-xl',
              ],
        ]"
        @click="onTitlebarClick"
      >
        <button
          v-if="isMobile"
          type="button"
          class="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
          @click="closeComposer"
        >
          <ChevronDown class="size-5" :stroke-width="1.75" />
        </button>

        <span class="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
          {{ composer.subject || 'New Message' }}
        </span>

        <!-- Desktop: traffic lights on the right -->
        <div
          v-if="!isMobile"
          class="flex shrink-0 items-center gap-2"
          @click.stop
        >
          <button
            v-if="!isMinimised"
            type="button"
            class="group/min flex size-3 items-center justify-center rounded-full bg-[#febc2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)] transition-[filter] hover:brightness-95 active:brightness-90"
            aria-label="Minimize"
            @click="minimiseComposer"
          >
            <Minus
              class="size-2 text-[#995700] opacity-0 transition-opacity group-hover/titlebar:opacity-100 group-focus-visible/min:opacity-100"
              :stroke-width="3"
            />
          </button>
          <button
            v-if="!isMaximised"
            type="button"
            class="group/max flex size-3 items-center justify-center rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)] transition-[filter] hover:brightness-95 active:brightness-90"
            :aria-label="isMinimised ? 'Restore' : 'Maximize'"
            @click="isMinimised ? restoreComposer() : maximiseComposer()"
          >
            <Plus
              class="size-2 text-[#006500] opacity-0 transition-opacity group-hover/titlebar:opacity-100 group-focus-visible/max:opacity-100"
              :stroke-width="3"
            />
          </button>
          <button
            v-else
            type="button"
            class="group/restore flex size-3 items-center justify-center rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)] transition-[filter] hover:brightness-95 active:brightness-90"
            aria-label="Restore"
            @click="restoreComposer"
          >
            <Minus
              class="size-2 rotate-45 text-[#006500] opacity-0 transition-opacity group-hover/titlebar:opacity-100 group-focus-visible/restore:opacity-100"
              :stroke-width="3"
            />
          </button>
          <button
            type="button"
            class="group/close flex size-3 items-center justify-center rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)] transition-[filter] hover:brightness-95 active:brightness-90"
            aria-label="Close"
            @click="closeComposer"
          >
            <X
              class="size-2 text-[#4d0000] opacity-0 transition-opacity group-hover/titlebar:opacity-100 group-focus-visible/close:opacity-100"
              :stroke-width="3"
            />
          </button>
        </div>

        <button
          v-if="isMobile"
          type="button"
          class="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
          @click="closeComposer"
        >
          <X class="size-5" :stroke-width="1.75" />
        </button>
      </div>

      <!-- Body (hidden when desktop-minimised) -->
      <template v-if="!isMinimised || isMobile">
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">

          <!-- To field -->
          <div class="flex items-start gap-2 border-b px-4 py-2.5">
            <span class="w-7 shrink-0 pt-1.5 text-xs text-muted-foreground">To</span>
            <div class="flex min-w-0 flex-1 flex-wrap gap-1">
              <span
                v-for="a in composer.to"
                :key="a.email"
                class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                {{ a.name || a.email }}
                <button type="button" @click="removeAddress('to', a.email)">
                  <X class="size-2.5" />
                </button>
              </span>
              <input
                v-model="toInput"
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="recipient@example.com"
                class="min-w-24 flex-1 bg-transparent text-sm outline-none"
                @keydown="onToKeydown"
                @blur="addAddress('to', toInput); toInput = ''"
              >
            </div>
            <button
              type="button"
              class="shrink-0 pt-1.5 text-xs text-muted-foreground hover:text-foreground"
              @click="showCc = !showCc"
            >
              Cc
            </button>
          </div>

          <!-- Cc field -->
          <div v-if="showCc" class="flex items-start gap-2 border-b px-4 py-2.5">
            <span class="w-7 shrink-0 pt-1.5 text-xs text-muted-foreground">Cc</span>
            <div class="flex min-w-0 flex-1 flex-wrap gap-1">
              <span
                v-for="a in composer.cc"
                :key="a.email"
                class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                {{ a.name || a.email }}
                <button type="button" @click="removeAddress('cc', a.email)">
                  <X class="size-2.5" />
                </button>
              </span>
              <input
                v-model="ccInput"
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="cc@example.com"
                class="min-w-24 flex-1 bg-transparent text-sm outline-none"
                @keydown="onCcKeydown"
                @blur="addAddress('cc', ccInput); ccInput = ''"
              >
            </div>
          </div>

          <!-- Subject field -->
          <div class="border-b px-4 py-2.5">
            <input
              v-model="composer.subject"
              type="text"
              placeholder="Subject"
              class="w-full bg-transparent text-sm outline-none"
            >
          </div>

          <!-- Body -->
          <textarea
            v-model="composer.body"
            class="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 text-base leading-relaxed outline-none md:text-sm"
            placeholder="Write your message…"
          />

          <!-- Attachments -->
          <div v-if="composer.attachments.length" class="flex flex-wrap gap-2 px-4 pb-2">
            <div
              v-for="att in composer.attachments"
              :key="att.clientId"
              class="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs"
            >
              <Loader2 v-if="att.uploading" class="size-3 animate-spin text-muted-foreground" />
              <Paperclip v-else class="size-3 text-muted-foreground" />
              <span class="max-w-[120px] truncate">{{ att.name }}</span>
              <span v-if="att.error" class="text-destructive">!</span>
              <button type="button" @click="composer.removeAttachment(att.clientId)">
                <X class="size-2.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>

          <!-- Toolbar -->
          <div
            class="flex shrink-0 items-center gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <button
              type="button"
              :disabled="!composer.readyToSend"
              :class="[
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                composer.readyToSend
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'cursor-not-allowed bg-muted text-muted-foreground',
              ]"
              @click="composer.send()"
            >
              <Loader2 v-if="composer.sending" class="size-4 animate-spin" />
              <Send v-else class="size-4" />
              {{ composer.sending ? 'Sending…' : 'Send' }}
            </button>

            <button
              type="button"
              class="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted"
              title="Attach file"
              @click="pickFile"
            >
              <Paperclip class="size-4" />
            </button>
            <input ref="fileInput" type="file" multiple class="hidden" @change="onFileChange">

            <span class="ml-auto text-xs text-muted-foreground">
              <template v-if="composer.saving">Saving…</template>
              <template v-else-if="composer.lastSavedAt">Saved</template>
            </span>

            <span v-if="composer.error" class="max-w-[40%] truncate text-xs text-destructive">
              {{ composer.error }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </Teleport>
</template>
