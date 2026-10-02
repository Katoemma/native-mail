<script setup lang="ts">
import {
  ArrowLeft, Reply, ReplyAll, Forward,
  Star, Archive, Trash2, MoreHorizontal,
  Paperclip, Download, ExternalLink,
} from '@lucide/vue'
import type { MailMessageFull } from '../../../shared/types'

const props = defineProps<{ emailId: string }>()
const emit = defineEmits<{
  back: []
  reply: [emailId: string]
  replyAll: [emailId: string]
  forward: [emailId: string]
}>()

const mailStore = useMailStore()
const mailboxesStore = useMailboxesStore()

const email = computed<MailMessageFull | null>(() => mailStore.fullEmails[props.emailId] ?? null)
const error = computed(() => mailStore.emailError)

// Local fetch state — starts true so we never flash "Select an email"
const isFetching = ref(true)

// Fetch on mount and whenever emailId changes, auto mark-read
async function loadEmail(id: string) {
  isFetching.value = true
  await mailStore.fetchOne(id)
  const e = mailStore.fullEmails[id]
  if (e && !e.isRead) {
    await mailStore.markRead(id, true)
  }
  isFetching.value = false
}

onMounted(() => loadEmail(props.emailId))

watch(() => props.emailId, (id) => {
  if (id) loadEmail(id)
})

// ---- Actions ----
async function trash() {
  await mailStore.trash(props.emailId)
  emit('back')
}

async function archive() {
  const archiveId = mailboxesStore.byRole('archive')?.id
  if (archiveId) {
    await mailStore.move(props.emailId, archiveId)
    emit('back')
  }
}

// ---- Helpers ----
function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString([], {
    weekday: 'short', year: 'numeric', month: 'short',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function addressList(list: { name?: string; email: string }[]) {
  return list.map(a => a.name ? `${a.name} <${a.email}>` : a.email).join(', ')
}

const showRaw = ref(false)
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Toolbar -->
    <div class="flex items-center gap-1 px-4 py-2 border-b shrink-0">
      <button
        class="p-1.5 rounded hover:bg-muted transition-colors"
        aria-label="Back"
        @click="emit('back')"
      >
        <ArrowLeft class="size-4" />
      </button>

      <div class="flex-1" />

      <template v-if="email">
        <button class="p-1.5 rounded hover:bg-muted transition-colors" title="Reply"
          @click="emit('reply', emailId)">
          <Reply class="size-4" />
        </button>
        <button class="p-1.5 rounded hover:bg-muted transition-colors" title="Reply all"
          @click="emit('replyAll', emailId)">
          <ReplyAll class="size-4" />
        </button>
        <button class="p-1.5 rounded hover:bg-muted transition-colors" title="Forward"
          @click="emit('forward', emailId)">
          <Forward class="size-4" />
        </button>

        <div class="w-px h-5 bg-border mx-1" />

        <button class="p-1.5 rounded hover:bg-muted transition-colors" title="Star"
          @click="mailStore.markStarred(emailId, !email.isStarred)">
          <Star :class="['size-4', email.isStarred ? 'fill-amber-400 text-amber-400' : '']" />
        </button>
        <button class="p-1.5 rounded hover:bg-muted transition-colors" title="Archive"
          @click="archive">
          <Archive class="size-4" />
        </button>
        <button class="p-1.5 rounded hover:bg-muted transition-colors text-destructive" title="Trash"
          @click="trash">
          <Trash2 class="size-4" />
        </button>
      </template>
    </div>

    <!-- Loading -->
    <div v-if="isFetching" class="flex-1 flex items-center justify-center">
      <div class="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <p class="text-sm text-destructive">{{ error }}</p>
    </div>

    <!-- Email content -->
    <div v-else-if="email" class="flex-1 overflow-y-auto">
      <div class="max-w-3xl mx-auto px-6 py-6 space-y-4">

        <!-- Subject -->
        <h1 class="text-xl font-semibold leading-tight">{{ email.subject }}</h1>

        <!-- Meta -->
        <div class="flex flex-wrap items-start gap-x-4 gap-y-1 text-sm text-muted-foreground border-b pb-4">
          <div class="flex gap-1 items-baseline">
            <span class="font-medium text-foreground">From:</span>
            <span>{{ addressList(email.from) }}</span>
          </div>
          <div v-if="email.to.length" class="flex gap-1 items-baseline">
            <span class="font-medium text-foreground">To:</span>
            <span>{{ addressList(email.to) }}</span>
          </div>
          <div v-if="email.cc.length" class="flex gap-1 items-baseline">
            <span class="font-medium text-foreground">Cc:</span>
            <span>{{ addressList(email.cc) }}</span>
          </div>
          <div class="ml-auto">{{ formatDate(email.receivedAt) }}</div>
        </div>

        <!-- HTML body -->
        <div
          v-if="email.htmlBody"
          class="prose prose-sm dark:prose-invert max-w-none"
          v-html="email.htmlBody"
        />
        <!-- Plain text fallback -->
        <pre
          v-else-if="email.textBody"
          class="whitespace-pre-wrap text-sm font-sans leading-relaxed"
        >{{ email.textBody }}</pre>
        <p v-else class="text-sm text-muted-foreground italic">(no content)</p>

        <!-- Attachments -->
        <div v-if="email.attachments.length" class="border-t pt-4 space-y-2">
          <p class="text-sm font-medium flex items-center gap-1.5">
            <Paperclip class="size-4" />
            {{ email.attachments.length }} attachment{{ email.attachments.length > 1 ? 's' : '' }}
          </p>
          <div class="flex flex-wrap gap-2">
            <a
              v-for="att in email.attachments"
              :key="att.blobId"
              :href="att.downloadUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <Download class="size-3.5" />
              <span class="max-w-[160px] truncate">{{ att.name }}</span>
              <span class="text-xs text-muted-foreground">
                ({{ (att.size / 1024).toFixed(0) }} KB)
              </span>
              <ExternalLink class="size-3 text-muted-foreground" />
            </a>
          </div>
        </div>

      </div>
    </div>

    <!-- Empty/no selection -->
    <div v-else class="flex-1 flex items-center justify-center text-muted-foreground">
      <p class="text-sm">Select an email to read</p>
    </div>
  </div>
</template>
