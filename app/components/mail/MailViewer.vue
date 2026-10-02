<script setup lang="ts">
import {
  ArrowLeft, Reply, ReplyAll, Forward,
  Star, Archive, Trash2,
  Paperclip, Download,
  MoreHorizontal,
} from '@lucide/vue'
import type { MailMessageFull } from '../../../shared/types'

const props = defineProps<{ emailId: string }>()
const emit = defineEmits<{
  back: []
  reply: [emailId: string]
  replyAll: [emailId: string]
  forward: [emailId: string]
}>()

const mailStore      = useMailStore()
const mailboxesStore = useMailboxesStore()

const email   = computed<MailMessageFull | null>(() => mailStore.fullEmails[props.emailId] ?? null)
const error   = computed(() => mailStore.emailError)
const isFetching = ref(true)
const visible    = ref(false)   // drives entry animation

async function loadEmail(id: string) {
  isFetching.value = true
  visible.value    = false
  await mailStore.fetchOne(id)
  const e = mailStore.fullEmails[id]
  if (e && !e.isRead) mailStore.markRead(id, true)
  isFetching.value = false
  // tiny delay so CSS transition starts after paint
  requestAnimationFrame(() => { visible.value = true })
}

onMounted(() => loadEmail(props.emailId))
watch(() => props.emailId, (id) => { if (id) loadEmail(id) })

// ── Actions ──────────────────────────────────────────────────────────────────
async function trash() {
  await mailStore.trash(props.emailId)
  emit('back')
}

async function archive() {
  const archiveId = mailboxesStore.byRole('archive')?.id
  if (archiveId) { await mailStore.move(props.emailId, archiveId); emit('back') }
}

// ── Formatting helpers ────────────────────────────────────────────────────────
function formatDateFull(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString([], {
    weekday: 'short', year: 'numeric', month: 'short',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function senderInitials(from: { name?: string | null; email: string }[]) {
  const f = from[0]
  if (!f) return '?'
  const n = f.name?.trim()
  if (n) {
    const parts = n.split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : n.slice(0, 2).toUpperCase()
  }
  return f.email.slice(0, 2).toUpperCase()
}

function senderName(from: { name?: string | null; email: string }[]) {
  const f = from[0]
  return f?.name?.trim() || f?.email || '(unknown)'
}

function senderEmail(from: { name?: string | null; email: string }[]) {
  return from[0]?.email ?? ''
}

function formatRecipients(list: { name?: string | null; email: string }[]) {
  return list.map(a => a.name?.trim() ? `${a.name} <${a.email}>` : a.email).join(', ')
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Show full recipients toggle
const showDetails = ref(false)
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden bg-background">

    <!-- ── Toolbar ──────────────────────────────────────────────────────── -->
    <div class="flex items-center gap-1 px-3 py-2 border-b shrink-0 bg-background/80 backdrop-blur-sm">
      <!-- Back -->
      <button
        class="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 active:scale-95"
        aria-label="Back"
        @click="emit('back')"
      >
        <ArrowLeft class="size-4" />
        <span>Back</span>
      </button>

      <div class="flex-1" />

      <template v-if="email">
        <!-- Reply / Reply all / Forward -->
        <div class="flex items-center gap-0.5 rounded-lg border bg-muted/40 px-1 py-1">
          <button
            class="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-background transition-colors duration-150 active:scale-95"
            @click="emit('reply', emailId)"
          >
            <Reply class="size-3.5" />
            <span>Reply</span>
          </button>
          <button
            class="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-background transition-colors duration-150 active:scale-95"
            @click="emit('replyAll', emailId)"
          >
            <ReplyAll class="size-3.5" />
            <span>Reply all</span>
          </button>
          <button
            class="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-background transition-colors duration-150 active:scale-95"
            @click="emit('forward', emailId)"
          >
            <Forward class="size-3.5" />
            <span>Forward</span>
          </button>
        </div>

        <div class="w-px h-4 bg-border mx-1" />

        <!-- Star -->
        <button
          class="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-sm transition-colors duration-150 active:scale-95"
          :class="email.isStarred
            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
          @click="mailStore.markStarred(emailId, !email.isStarred)"
        >
          <Star :class="['size-4', email.isStarred && 'fill-amber-400']" />
          <span>{{ email.isStarred ? 'Starred' : 'Star' }}</span>
        </button>

        <!-- Archive -->
        <button
          class="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 active:scale-95"
          @click="archive"
        >
          <Archive class="size-4" />
          <span>Archive</span>
        </button>

        <!-- Trash -->
        <button
          class="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150 active:scale-95"
          @click="trash"
        >
          <Trash2 class="size-4" />
          <span>Trash</span>
        </button>
      </template>
    </div>

    <!-- ── Loading skeleton ─────────────────────────────────────────────── -->
    <div v-if="isFetching" class="flex-1 overflow-y-auto">
      <div class="w-full px-8 py-8 space-y-6 animate-pulse">
        <div class="h-6 w-2/3 rounded-lg bg-muted" />
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-full bg-muted shrink-0" />
          <div class="space-y-2 flex-1">
            <div class="h-3.5 w-32 rounded bg-muted" />
            <div class="h-3 w-48 rounded bg-muted" />
          </div>
          <div class="h-3 w-24 rounded bg-muted" />
        </div>
        <div class="space-y-3 pt-4">
          <div class="h-3 w-full rounded bg-muted" />
          <div class="h-3 w-5/6 rounded bg-muted" />
          <div class="h-3 w-4/6 rounded bg-muted" />
          <div class="h-3 w-full rounded bg-muted" />
          <div class="h-3 w-3/6 rounded bg-muted" />
        </div>
      </div>
    </div>

    <!-- ── Error ────────────────────────────────────────────────────────── -->
    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
      <div class="size-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <span class="text-destructive text-xl">!</span>
      </div>
      <p class="text-sm font-medium text-foreground">Failed to load email</p>
      <p class="text-xs text-muted-foreground max-w-xs">{{ error }}</p>
      <button
        class="mt-2 text-xs text-primary hover:underline"
        @click="loadEmail(emailId)"
      >
        Try again
      </button>
    </div>

    <!-- ── Email content ────────────────────────────────────────────────── -->
    <div
      v-else-if="email"
      :class="[
        'flex-1 overflow-y-auto transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
      ]"
    >
      <div class="w-full px-8 py-8">

        <!-- Subject -->
        <h1 class="text-2xl font-semibold tracking-tight text-foreground leading-snug mb-6">
          {{ email.subject }}
        </h1>

        <!-- Sender card -->
        <div class="flex items-start gap-3 mb-1">
          <!-- Avatar -->
          <div
            class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0 select-none"
          >
            {{ senderInitials(email.from) }}
          </div>

          <!-- Sender info + date -->
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="font-semibold text-sm text-foreground">{{ senderName(email.from) }}</span>
              <span class="text-xs text-muted-foreground">&lt;{{ senderEmail(email.from) }}&gt;</span>
              <span class="ml-auto text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                {{ formatDateFull(email.receivedAt) }}
              </span>
            </div>

            <!-- To/Cc collapsed by default -->
            <button
              class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5 group"
              @click="showDetails = !showDetails"
            >
              <span>To: {{ formatRecipients(email.to) }}</span>
              <MoreHorizontal class="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <!-- Expanded recipient details -->
            <div
              v-if="showDetails"
              class="mt-2 space-y-1 text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30"
            >
              <div v-if="email.from.length">
                <span class="font-medium text-foreground w-8 inline-block">From:</span>
                {{ formatRecipients(email.from) }}
              </div>
              <div v-if="email.to.length">
                <span class="font-medium text-foreground w-8 inline-block">To:</span>
                {{ formatRecipients(email.to) }}
              </div>
              <div v-if="email.cc.length">
                <span class="font-medium text-foreground w-8 inline-block">Cc:</span>
                {{ formatRecipients(email.cc) }}
              </div>
              <div v-if="email.replyTo?.length">
                <span class="font-medium text-foreground w-8 inline-block">Reply-To:</span>
                {{ formatRecipients(email.replyTo) }}
              </div>
              <div>
                <span class="font-medium text-foreground w-8 inline-block">Date:</span>
                {{ formatDateFull(email.receivedAt) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t my-6" />

        <!-- Body -->
        <div class="email-body">
          <!-- HTML email -->
          <div
            v-if="email.htmlBody"
            class="prose prose-sm dark:prose-invert w-full max-w-none text-foreground
                   prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                   prose-img:rounded-lg prose-img:max-w-full"
            v-html="email.htmlBody"
          />
          <!-- Plain text -->
          <pre
            v-else-if="email.textBody"
            class="whitespace-pre-wrap font-sans text-sm leading-7 text-foreground"
          >{{ email.textBody }}</pre>
          <p v-else class="text-sm text-muted-foreground italic">
            (This message has no readable content)
          </p>
        </div>

        <!-- Attachments -->
        <div v-if="email.attachments?.length" class="mt-8 pt-6 border-t">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Paperclip class="size-3.5" />
            {{ email.attachments.length }} Attachment{{ email.attachments.length > 1 ? 's' : '' }}
          </p>
          <div class="flex flex-wrap gap-2">
            <a
              v-for="att in email.attachments"
              :key="att.blobId"
              :href="att.downloadUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="group inline-flex items-center gap-2.5 rounded-xl border bg-muted/30
                     hover:bg-muted hover:border-border/80
                     px-3.5 py-2.5 transition-all duration-150 active:scale-98 no-underline"
            >
              <!-- File type icon area -->
              <div class="size-8 rounded-lg bg-background border flex items-center justify-center shrink-0">
                <Download class="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div class="min-w-0">
                <p class="text-xs font-medium text-foreground truncate max-w-[140px]">{{ att.name }}</p>
                <p class="text-[11px] text-muted-foreground">{{ formatSize(att.size) }}</p>
              </div>
            </a>
          </div>
        </div>

        <!-- Quick reply nudge -->
        <div class="mt-10 pt-6 border-t">
          <button
            class="w-full flex items-center gap-3 rounded-xl border border-dashed px-4 py-3
                   text-sm text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/30
                   transition-all duration-150 group"
            @click="emit('reply', emailId)"
          >
            <div class="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
              <Reply class="size-3.5 group-hover:text-primary transition-colors" />
            </div>
            <span>Reply to {{ senderName(email.from) }}…</span>
          </button>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
/* Smooth entry animation */
.translate-y-1 {
  --tw-translate-y: 4px;
}

/* Active scale for action buttons */
.active\:scale-95:active {
  transform: scale(0.95);
}

.active\:scale-98:active {
  transform: scale(0.98);
}

/* Email body isolation — prevent external styles leaking in */
.email-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.email-body :deep(a) {
  word-break: break-all;
}

/* Quoted reply styling */
.email-body :deep(blockquote) {
  border-left: 3px solid hsl(var(--border));
  padding-left: 1rem;
  color: hsl(var(--muted-foreground));
  margin: 1rem 0;
}
</style>
