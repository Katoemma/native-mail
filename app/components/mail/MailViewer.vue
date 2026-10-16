<script setup lang="ts">
import {
  ArrowLeft, Reply, ReplyAll, Forward,
  Star, Archive, Trash2, MailOpen,
  Paperclip, Download, FileText, FileImage, File,
  MoreHorizontal, ChevronDown, Send, Loader2,
  Copy, Check,
} from '@lucide/vue'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { MailAttachment, MailMessageFull } from '../../../shared/types'
import { enhanceHtmlLinks, linkifyPlainText } from '~/utils/linkify'

const props = withDefaults(defineProps<{
  emailId: string
  /** Compact mode when nested inside a thread accordion */
  inline?: boolean
}>(), { inline: false })

const emit = defineEmits<{
  back: []
  reply: [emailId: string]
  replyAll: [emailId: string]
  forward: [emailId: string]
}>()

const mailStore      = useMailStore()
const mailboxesStore = useMailboxesStore()
const composer       = useComposerStore()

const email      = computed<MailMessageFull | null>(() => mailStore.fullEmails[props.emailId] ?? null)
const error      = computed(() => mailStore.emailError)
const isFetching = ref(true)
const visible    = ref(false)

async function loadEmail(id: string) {
  isFetching.value = true
  visible.value    = false
  quoteExpanded.value = false
  replyOpen.value = false
  replyBody.value = ''
  await mailStore.fetchOne(id)
  const e = mailStore.fullEmails[id]
  if (e && !e.isRead) mailStore.markRead(id, true)
  isFetching.value = false
  requestAnimationFrame(() => { visible.value = true })
}

onMounted(() => loadEmail(props.emailId))
watch(() => props.emailId, (id) => { if (id) loadEmail(id) })

// ── Actions ──────────────────────────────────────────────────────────────────
const confirmOpen = ref(false)
const confirming  = ref(false)

const trashMailboxId = computed(() => mailboxesStore.trash?.id ?? null)

/** Already in Trash → permanent delete; otherwise move to Trash */
const isInTrash = computed(() => {
  const e = email.value
  const trashId = trashMailboxId.value
  if (!e || !trashId) return false
  return !!e.mailboxIds?.[trashId]
})

const confirmTitle = computed(() =>
  isInTrash.value ? 'Delete permanently?' : 'Move to Trash?',
)

const confirmDescription = computed(() => {
  const subject = email.value?.subject?.trim() || '(no subject)'
  if (isInTrash.value) {
    return `"${subject}" will be permanently deleted. This cannot be undone.`
  }
  return `"${subject}" will be moved to Trash. You can recover it later from there.`
})

const confirmActionLabel = computed(() =>
  isInTrash.value ? 'Delete forever' : 'Move to Trash',
)

function requestTrash() {
  confirmOpen.value = true
}

async function confirmTrash() {
  if (confirming.value) return
  confirming.value = true
  try {
    if (isInTrash.value) {
      await mailStore.destroy(props.emailId)
    }
    else {
      await mailStore.trash(props.emailId)
    }
    confirmOpen.value = false
    emit('back')
  }
  catch {
    // Keep dialog open so the user can retry / cancel
  }
  finally {
    confirming.value = false
  }
}

async function archive() {
  const archiveId = mailboxesStore.byRole('archive')?.id
  if (archiveId) { await mailStore.move(props.emailId, archiveId); emit('back') }
}

async function markUnread() {
  await mailStore.markRead(props.emailId, false)
  emit('back')
}

const copied = ref(false)
async function copyAddress(addr: string) {
  try {
    await navigator.clipboard.writeText(addr)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  }
  catch { /* ignore */ }
}

// ── Relative time ────────────────────────────────────────────────────────────
function formatRelative(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatDateFull(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString([], {
    weekday: 'short', year: 'numeric', month: 'short',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Sender helpers ───────────────────────────────────────────────────────────
function senderInitials(from: { name?: string | null; email: string }[]) {
  const f = from[0]
  if (!f) return '?'
  const n = f.name?.trim()
  if (n) {
    const parts = n.split(/\s+/)
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
  return list.map(a => a.name?.trim() ? `${a.name}` : a.email).join(', ')
}

/** Deterministic soft avatar color from email address */
function avatarStyle(emailAddr: string) {
  let hash = 0
  for (let i = 0; i < emailAddr.length; i++) hash = emailAddr.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return {
    backgroundColor: `oklch(0.92 0.04 ${hue})`,
    color: `oklch(0.45 0.12 ${hue})`,
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(att: MailAttachment) {
  return att.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name)
}

function previewUrl(att: MailAttachment) {
  const url = new URL(att.downloadUrl, 'http://local')
  url.searchParams.set('inline', '1')
  return `${url.pathname}?${url.searchParams.toString()}`
}

function fileIcon(att: MailAttachment) {
  if (isImage(att)) return FileImage
  if (/pdf|text|doc|sheet|csv/i.test(att.type) || /\.(pdf|txt|docx?|xlsx?|csv)$/i.test(att.name)) return FileText
  return File
}

// ── Quote collapsing ─────────────────────────────────────────────────────────
const quoteExpanded = ref(false)
const showDetails   = ref(false)

const plainParts = computed(() => {
  const text = email.value?.textBody
  if (!text || email.value?.htmlBody) return null

  // Split on "On … wrote:" or a run of quoted lines
  const onWrote = /\n(?=On .+ wrote:\s*\n)/
  const idx = text.search(onWrote)
  if (idx > 0) {
    return { main: text.slice(0, idx).trim(), quote: text.slice(idx).trim() }
  }

  const lines = text.split('\n')
  let quoteStart = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^>/.test(lines[i])) { quoteStart = i; break }
  }
  if (quoteStart > 0) {
    return {
      main:  lines.slice(0, quoteStart).join('\n').trim(),
      quote: lines.slice(quoteStart).join('\n').trim(),
    }
  }
  return { main: text, quote: '' }
})

const plainMainHtml = computed(() =>
  plainParts.value?.main ? linkifyPlainText(plainParts.value.main) : '',
)
const plainQuoteHtml = computed(() =>
  plainParts.value?.quote ? linkifyPlainText(plainParts.value.quote) : '',
)

const safeHtmlBody = computed(() => {
  const html = email.value?.htmlBody
  if (!html) return ''
  return enhanceHtmlLinks(html)
})

const htmlHasQuote = computed(() => {
  const html = email.value?.htmlBody
  if (!html) return false
  return /<blockquote/i.test(html) || /gmail_quote|yahoo_quoted|OutlookMessageHeader/i.test(html)
})

// ── Inline quick reply ───────────────────────────────────────────────────────
const replyOpen   = ref(false)
const replyBody   = ref('')
const replySending = ref(false)
const replyError  = ref<string | null>(null)
const replyBox    = ref<HTMLTextAreaElement | null>(null)

function openQuickReply() {
  replyOpen.value = true
  replyError.value = null
  nextTick(() => replyBox.value?.focus())
}

function expandFullReply() {
  emit('reply', props.emailId)
}

async function sendQuickReply() {
  if (!email.value || !replyBody.value.trim() || replySending.value) return
  replySending.value = true
  replyError.value = null
  try {
    await composer.quickReply(
      {
        id: email.value.id,
        threadId: email.value.threadId,
        from: email.value.from,
        subject: email.value.subject,
      },
      replyBody.value,
    )
    replyBody.value = ''
    replyOpen.value = false
  }
  catch (err: unknown) {
    replyError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
      ?? (err instanceof Error ? err.message : 'Send failed')
  }
  finally {
    replySending.value = false
  }
}

function onReplyKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    sendQuickReply()
  }
  if (e.key === 'Escape') {
    replyOpen.value = false
  }
}

const imageAttachments = computed(() =>
  (email.value?.attachments ?? []).filter(isImage),
)
const otherAttachments = computed(() =>
  (email.value?.attachments ?? []).filter(a => !isImage(a)),
)
</script>

<template>
  <TooltipProvider :delay-duration="400">
    <div
      :class="[
        'flex flex-col overflow-hidden bg-background',
        inline ? 'h-auto' : 'h-full w-full',
      ]"
    >
      <!-- ── Toolbar (hidden in inline/thread mode) ──────────────────────── -->
      <div
        v-if="!inline"
        class="flex items-center gap-0.5 px-2 sm:px-3 py-1.5 border-b shrink-0 bg-background/90 backdrop-blur-md sticky top-0 z-10"
      >
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              class="inline-flex items-center gap-1.5 px-2 h-8 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 active:scale-[0.97]"
              aria-label="Back"
              @click="emit('back')"
            >
              <ArrowLeft class="size-4 shrink-0" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Back</TooltipContent>
        </Tooltip>

        <div class="flex-1" />

        <template v-if="email">
          <div class="flex items-center gap-0.5 rounded-xl border bg-muted/30 p-0.5">
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  class="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-background transition-colors duration-150 active:scale-[0.97]"
                  @click="emit('reply', emailId)"
                >
                  <Reply class="size-3.5 shrink-0" />
                  <span class="hidden sm:inline text-xs">Reply</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Reply</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  class="inline-flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors duration-150 active:scale-[0.97]"
                  @click="emit('replyAll', emailId)"
                >
                  <ReplyAll class="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Reply all</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  class="inline-flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors duration-150 active:scale-[0.97]"
                  @click="emit('forward', emailId)"
                >
                  <Forward class="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Forward</TooltipContent>
            </Tooltip>
          </div>

          <div class="w-px h-4 bg-border mx-1.5" />

          <Tooltip>
            <TooltipTrigger as-child>
              <button
                class="inline-flex items-center justify-center size-8 rounded-lg transition-colors duration-150 active:scale-[0.97]"
                :class="email.isStarred
                  ? 'text-amber-500 hover:bg-amber-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
                @click="mailStore.markStarred(emailId, !email.isStarred)"
              >
                <Star :class="['size-4', email.isStarred && 'fill-amber-400']" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{{ email.isStarred ? 'Unstar' : 'Star' }}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <button
                class="inline-flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 active:scale-[0.97]"
                @click="markUnread"
              >
                <MailOpen class="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Mark unread</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <button
                class="inline-flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 active:scale-[0.97]"
                @click="archive"
              >
                <Archive class="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <button
                class="inline-flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150 active:scale-[0.97]"
                :aria-label="isInTrash ? 'Delete permanently' : 'Move to Trash'"
                @click="requestTrash"
              >
                <Trash2 class="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{{ isInTrash ? 'Delete permanently' : 'Move to Trash' }}</TooltipContent>
          </Tooltip>
        </template>
      </div>

      <!-- Confirm trash / permanent delete -->
      <AlertDialog v-model:open="confirmOpen">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ confirmTitle }}</AlertDialogTitle>
            <AlertDialogDescription>{{ confirmDescription }}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel :disabled="confirming">Cancel</AlertDialogCancel>
            <AlertDialogAction
              class="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20"
              :disabled="confirming"
              @click.prevent="confirmTrash"
            >
              {{ confirming ? 'Working…' : confirmActionLabel }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <!-- ── Loading ────────────────────────────────────────────────────── -->
      <div v-if="isFetching" class="flex-1 overflow-y-auto">
        <div class="w-full px-5 sm:px-8 py-8 space-y-6 animate-pulse">
          <div class="h-7 w-2/3 rounded-lg bg-muted" />
          <div class="flex items-center gap-3">
            <div class="size-11 rounded-full bg-muted shrink-0" />
            <div class="space-y-2 flex-1">
              <div class="h-3.5 w-36 rounded bg-muted" />
              <div class="h-3 w-52 rounded bg-muted" />
            </div>
          </div>
          <div class="space-y-2.5 pt-2">
            <div class="h-3 w-full rounded bg-muted" />
            <div class="h-3 w-5/6 rounded bg-muted" />
            <div class="h-3 w-4/6 rounded bg-muted" />
          </div>
        </div>
      </div>

      <!-- ── Error ──────────────────────────────────────────────────────── -->
      <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6 py-16">
        <div class="size-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <span class="text-destructive text-xl font-medium">!</span>
        </div>
        <p class="text-sm font-medium">Failed to load email</p>
        <p class="text-xs text-muted-foreground max-w-xs">{{ error }}</p>
        <button class="mt-1 text-xs text-primary hover:underline" @click="loadEmail(emailId)">
          Try again
        </button>
      </div>

      <!-- ── Content ────────────────────────────────────────────────────── -->
      <div
        v-else-if="email"
        :class="[
          'flex-1 overflow-y-auto transition-opacity duration-200 ease-out',
          visible ? 'opacity-100' : 'opacity-0',
        ]"
      >
        <div :class="['w-full', inline ? 'px-0 py-2' : 'px-5 sm:px-8 py-6 sm:py-8']">

          <!-- Subject -->
          <h1
            v-if="!inline"
            class="text-[1.35rem] sm:text-2xl font-semibold tracking-tight text-foreground leading-snug mb-5 text-balance"
          >
            {{ email.subject || '(no subject)' }}
          </h1>

          <!-- Sender row -->
          <div class="flex items-start gap-3 mb-5">
            <div
              class="size-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 select-none ring-1 ring-black/5"
              :style="avatarStyle(senderEmail(email.from))"
            >
              {{ senderInitials(email.from) }}
            </div>

            <div class="flex-1 min-w-0 pt-0.5">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-sm text-foreground">{{ senderName(email.from) }}</span>
                <button
                  class="group inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  :title="senderEmail(email.from)"
                  @click="copyAddress(senderEmail(email.from))"
                >
                  <span class="truncate max-w-[200px]">{{ senderEmail(email.from) }}</span>
                  <Check v-if="copied" class="size-3 text-emerald-500" />
                  <Copy v-else class="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <time
                      class="ml-auto text-xs text-muted-foreground shrink-0 tabular-nums"
                      :datetime="email.receivedAt ?? undefined"
                    >
                      {{ formatRelative(email.receivedAt) }}
                    </time>
                  </TooltipTrigger>
                  <TooltipContent>{{ formatDateFull(email.receivedAt) }}</TooltipContent>
                </Tooltip>
              </div>

              <button
                class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                @click="showDetails = !showDetails"
              >
                <span class="truncate">To {{ formatRecipients(email.to) }}</span>
                <ChevronDown
                  :class="['size-3.5 shrink-0 transition-transform duration-200', showDetails && 'rotate-180']"
                />
              </button>

              <div
                v-if="showDetails"
                class="mt-2.5 space-y-1.5 text-xs text-muted-foreground rounded-xl border bg-muted/40 p-3 animate-in fade-in-0 slide-in-from-top-1 duration-150"
              >
                <div class="grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-1.5">
                  <span class="font-medium text-foreground">From</span>
                  <span class="break-all">{{ email.from.map(a => a.email).join(', ') }}</span>
                  <span class="font-medium text-foreground">To</span>
                  <span class="break-all">{{ email.to.map(a => a.email).join(', ') }}</span>
                  <template v-if="email.cc.length">
                    <span class="font-medium text-foreground">Cc</span>
                    <span class="break-all">{{ email.cc.map(a => a.email).join(', ') }}</span>
                  </template>
                  <span class="font-medium text-foreground">Date</span>
                  <span>{{ formatDateFull(email.receivedAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="email-body">
            <!-- HTML -->
            <template v-if="email.htmlBody">
              <div
                class="prose prose-sm dark:prose-invert w-full max-w-none text-foreground
                       prose-a:text-primary prose-a:underline prose-a:underline-offset-2
                       hover:prose-a:opacity-80 prose-img:rounded-xl prose-img:max-w-full"
                :class="!quoteExpanded && htmlHasQuote && 'quote-collapsed'"
                v-html="safeHtmlBody"
              />
              <button
                v-if="htmlHasQuote"
                class="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground
                       hover:text-foreground hover:bg-muted transition-colors duration-150"
                @click="quoteExpanded = !quoteExpanded"
              >
                <MoreHorizontal class="size-3.5" />
                {{ quoteExpanded ? 'Hide quoted text' : 'Show quoted text' }}
              </button>
            </template>

            <!-- Plain text with quote split + linkified URLs -->
            <template v-else-if="plainParts">
              <div
                class="email-plain text-sm leading-7 text-foreground"
                v-html="plainMainHtml"
              />
              <template v-if="plainParts.quote">
                <button
                  class="mt-3 mb-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground
                         hover:text-foreground hover:bg-muted transition-colors duration-150"
                  @click="quoteExpanded = !quoteExpanded"
                >
                  <MoreHorizontal class="size-3.5" />
                  {{ quoteExpanded ? 'Hide quoted text' : 'Show quoted text' }}
                </button>
                <div
                  v-if="quoteExpanded"
                  class="email-plain text-sm leading-7 text-muted-foreground border-l-2 border-border pl-4 mt-2 animate-in fade-in-0 duration-150"
                  v-html="plainQuoteHtml"
                />
              </template>
            </template>

            <p v-else class="text-sm text-muted-foreground italic">
              (This message has no readable content)
            </p>
          </div>

          <!-- Image attachment previews -->
          <div v-if="imageAttachments.length" class="mt-8 space-y-3">
            <p class="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileImage class="size-3.5" />
              {{ imageAttachments.length }} image{{ imageAttachments.length > 1 ? 's' : '' }}
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <a
                v-for="att in imageAttachments"
                :key="att.blobId"
                :href="att.downloadUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="group relative aspect-[4/3] rounded-xl border overflow-hidden bg-muted/40
                       hover:ring-2 hover:ring-primary/30 transition-all duration-150"
              >
                <img
                  :src="previewUrl(att)"
                  :alt="att.name"
                  class="size-full object-cover"
                  loading="lazy"
                >
                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6
                            opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <p class="text-[11px] text-white truncate">{{ att.name }}</p>
                </div>
              </a>
            </div>
          </div>

          <!-- Other attachments -->
          <div v-if="otherAttachments.length" class="mt-6">
            <p class="text-xs font-medium text-muted-foreground mb-2.5 flex items-center gap-1.5">
              <Paperclip class="size-3.5" />
              {{ otherAttachments.length }} file{{ otherAttachments.length > 1 ? 's' : '' }}
            </p>
            <div class="flex flex-wrap gap-2">
              <a
                v-for="att in otherAttachments"
                :key="att.blobId"
                :href="att.downloadUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="group inline-flex items-center gap-2.5 rounded-xl border bg-muted/20
                       hover:bg-muted/60 hover:border-border
                       px-3 py-2.5 transition-colors duration-150 no-underline max-w-full"
              >
                <div class="size-9 rounded-lg bg-background border flex items-center justify-center shrink-0">
                  <component :is="fileIcon(att)" class="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-medium text-foreground truncate max-w-[160px]">{{ att.name }}</p>
                  <p class="text-[11px] text-muted-foreground flex items-center gap-1">
                    {{ formatSize(att.size) }}
                    <Download class="size-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                </div>
              </a>
            </div>
          </div>

          <!-- Single image that was the only attachment still shown above; if only images, skip duplicate paperclip section — handled -->

          <!-- Inline quick reply -->
          <div v-if="!inline" class="mt-10 pt-2">
            <div
              v-if="!replyOpen"
              class="rounded-2xl border border-dashed border-border/80 bg-muted/20
                     hover:bg-muted/40 hover:border-border transition-colors duration-150"
            >
              <button
                class="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-muted-foreground hover:text-foreground text-left"
                @click="openQuickReply"
              >
                <div
                  class="size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ring-1 ring-black/5"
                  :style="avatarStyle(senderEmail(email.from))"
                >
                  {{ senderInitials(email.from).charAt(0) }}
                </div>
                <span class="flex-1">Reply to {{ senderName(email.from).split(' ')[0] }}…</span>
                <kbd class="hidden sm:inline text-[10px] text-muted-foreground/70 border rounded px-1.5 py-0.5 font-sans">R</kbd>
              </button>
            </div>

            <div
              v-else
              class="rounded-2xl border bg-background shadow-sm ring-1 ring-black/5 overflow-hidden
                     animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
            >
              <div class="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30 text-xs text-muted-foreground">
                <Reply class="size-3.5" />
                <span>Replying to <span class="font-medium text-foreground">{{ senderName(email.from) }}</span></span>
                <button
                  class="ml-auto text-xs hover:text-foreground transition-colors"
                  @click="expandFullReply"
                >
                  Open full composer
                </button>
              </div>
              <textarea
                ref="replyBox"
                v-model="replyBody"
                rows="4"
                placeholder="Write your reply…"
                class="w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground/60"
                @keydown="onReplyKeydown"
              />
              <div class="flex items-center gap-2 px-3 py-2.5 border-t bg-muted/20">
                <p v-if="replyError" class="text-xs text-destructive flex-1 truncate">{{ replyError }}</p>
                <p v-else class="text-[11px] text-muted-foreground flex-1 hidden sm:block">
                  <kbd class="border rounded px-1 py-0.5 font-sans">⌘</kbd>
                  <kbd class="border rounded px-1 py-0.5 font-sans ml-0.5">Enter</kbd>
                  to send · Esc to cancel
                </p>
                <button
                  class="text-xs text-muted-foreground hover:text-foreground px-2.5 h-8 rounded-lg hover:bg-muted transition-colors"
                  @click="replyOpen = false"
                >
                  Cancel
                </button>
                <button
                  class="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground
                         px-3.5 h-8 text-xs font-medium
                         hover:opacity-90 disabled:opacity-40 transition-opacity active:scale-[0.97]"
                  :disabled="!replyBody.trim() || replySending"
                  @click="sendQuickReply"
                >
                  <Loader2 v-if="replySending" class="size-3.5 animate-spin" />
                  <Send v-else class="size-3.5" />
                  Send
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </TooltipProvider>
</template>

<style scoped>
/* Collapse quoted HTML (Gmail / Outlook / blockquote) until expanded */
.quote-collapsed :deep(blockquote),
.quote-collapsed :deep(.gmail_quote),
.quote-collapsed :deep(.yahoo_quoted),
.quote-collapsed :deep(#divRplyFwdMsg),
.quote-collapsed :deep(.OutlookMessageHeader) {
  display: none;
}

.email-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.email-body :deep(a),
.email-plain :deep(a) {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.email-body :deep(a:hover),
.email-plain :deep(a:hover) {
  opacity: 0.85;
}

.email-body :deep(blockquote) {
  border-left: 3px solid var(--border);
  padding-left: 1rem;
  color: var(--muted-foreground);
  margin: 1rem 0;
}
</style>
