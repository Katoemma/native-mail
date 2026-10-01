<script setup lang="ts">
import { X, Minus, Maximize2, Send, Paperclip, Loader2 } from '@lucide/vue'

const composer = useComposerStore()

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

// Auto-save debounce
let saveTimer: ReturnType<typeof setTimeout>
watch([() => composer.body, () => composer.subject], () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => composer.saveDraft(), 3000)
})
onUnmounted(() => clearTimeout(saveTimer))

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

// Minimised state
const minimised = ref(false)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="composer.open"
      :class="[
        'fixed z-50 bg-background border rounded-t-xl shadow-2xl flex flex-col transition-all',
        minimised
          ? 'bottom-0 right-6 w-72 h-12'
          : 'bottom-0 right-6 w-[560px] h-[520px]',
      ]"
    >
      <!-- Header -->
      <div class="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/50 rounded-t-xl shrink-0 cursor-pointer select-none"
        @click="minimised = !minimised">
        <span class="text-sm font-medium flex-1 truncate">
          {{ composer.subject || 'New Message' }}
        </span>
        <button class="p-0.5 rounded hover:bg-muted" @click.stop="minimised = !minimised">
          <Minus class="size-3.5" />
        </button>
        <button class="p-0.5 rounded hover:bg-muted" @click.stop="composer.close()">
          <X class="size-3.5" />
        </button>
      </div>

      <!-- Body (hidden when minimised) -->
      <template v-if="!minimised">
        <div class="flex flex-col flex-1 overflow-hidden">

          <!-- To field -->
          <div class="flex items-start gap-2 px-4 py-2 border-b">
            <span class="text-xs text-muted-foreground pt-1.5 w-6 shrink-0">To</span>
            <div class="flex flex-wrap flex-1 gap-1">
              <span
                v-for="a in composer.to"
                :key="a.email"
                class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                {{ a.name || a.email }}
                <button @click="removeAddress('to', a.email)"><X class="size-2.5" /></button>
              </span>
              <input
                v-model="toInput"
                type="email"
                placeholder="recipient@example.com"
                class="flex-1 min-w-24 text-sm outline-none bg-transparent"
                @keydown="onToKeydown"
                @blur="addAddress('to', toInput); toInput = ''"
              />
            </div>
            <button class="text-xs text-muted-foreground hover:text-foreground shrink-0 pt-1.5"
              @click="showCc = !showCc">
              Cc
            </button>
          </div>

          <!-- Cc field -->
          <div v-if="showCc" class="flex items-start gap-2 px-4 py-2 border-b">
            <span class="text-xs text-muted-foreground pt-1.5 w-6 shrink-0">Cc</span>
            <div class="flex flex-wrap flex-1 gap-1">
              <span
                v-for="a in composer.cc"
                :key="a.email"
                class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                {{ a.name || a.email }}
                <button @click="removeAddress('cc', a.email)"><X class="size-2.5" /></button>
              </span>
              <input
                v-model="ccInput"
                type="email"
                placeholder="cc@example.com"
                class="flex-1 min-w-24 text-sm outline-none bg-transparent"
                @keydown="onCcKeydown"
                @blur="addAddress('cc', ccInput); ccInput = ''"
              />
            </div>
          </div>

          <!-- Subject field -->
          <div class="px-4 py-2 border-b">
            <input
              v-model="composer.subject"
              type="text"
              placeholder="Subject"
              class="w-full text-sm outline-none bg-transparent"
            />
          </div>

          <!-- Body -->
          <textarea
            v-model="composer.body"
            class="flex-1 resize-none px-4 py-3 text-sm outline-none bg-transparent"
            placeholder="Write your message…"
          />

          <!-- Attachments -->
          <div v-if="composer.attachments.length" class="px-4 pb-2 flex flex-wrap gap-2">
            <div
              v-for="att in composer.attachments"
              :key="att.clientId"
              class="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs"
            >
              <Loader2 v-if="att.uploading" class="size-3 animate-spin text-muted-foreground" />
              <Paperclip v-else class="size-3 text-muted-foreground" />
              <span class="max-w-[120px] truncate">{{ att.name }}</span>
              <span v-if="att.error" class="text-destructive">!</span>
              <button @click="composer.removeAttachment(att.clientId)">
                <X class="size-2.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>

          <!-- Toolbar -->
          <div class="flex items-center gap-2 px-4 py-2.5 border-t shrink-0">
            <button
              :disabled="!composer.readyToSend"
              :class="[
                'inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                composer.readyToSend
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              ]"
              @click="composer.send()"
            >
              <Loader2 v-if="composer.sending" class="size-4 animate-spin" />
              <Send v-else class="size-4" />
              {{ composer.sending ? 'Sending…' : 'Send' }}
            </button>

            <button
              class="p-1.5 rounded hover:bg-muted transition-colors"
              title="Attach file"
              @click="pickFile"
            >
              <Paperclip class="size-4" />
            </button>
            <input ref="fileInput" type="file" multiple class="hidden" @change="onFileChange" />

            <span class="ml-auto text-xs text-muted-foreground">
              <template v-if="composer.saving">Saving…</template>
              <template v-else-if="composer.lastSavedAt">Saved</template>
            </span>

            <span v-if="composer.error" class="text-xs text-destructive">{{ composer.error }}</span>
          </div>
        </div>
      </template>
    </div>
  </Teleport>
</template>
