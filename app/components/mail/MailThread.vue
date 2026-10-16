<script setup lang="ts">
import { ArrowLeft, Reply, ReplyAll, Forward, ChevronDown, ChevronUp } from '@lucide/vue'
import type { MailMessage } from '../../../shared/types'
import { avatarStyle, senderInitials } from '~/utils/avatar'

const props = defineProps<{ threadId: string }>()
const emit  = defineEmits<{
  back:      []
  reply:     [emailId: string]
  replyAll:  [emailId: string]
  forward:   [emailId: string]
}>()

const threadStore  = useThreadStore()
const mailStore    = useMailStore()
const composer     = useComposerStore()

const { thread, emails, loading, error } = useThread(computed(() => props.threadId))

// Track which messages are expanded (latest always open)
const expanded = ref<Set<string>>(new Set())

watch(emails, (list) => {
  if (list.length) {
    const last = list[list.length - 1]
    expanded.value = new Set([last.id])
  }
}, { immediate: true })

function toggle(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function senderName(email: MailMessage) {
  const f = email.from[0]
  return f?.name || f?.email || '(unknown)'
}

function threadInitials(email: MailMessage) {
  const f = email.from[0]
  return senderInitials(f?.name, f?.email)
}

function threadAvatar(email: MailMessage) {
  const f = email.from[0]
  return avatarStyle(f?.email || f?.name || '?')
}

// Reply helpers — need full email from store
function doReply(email: MailMessage) {
  composer.openReply({
    id: email.id,
    threadId: email.threadId,
    from: email.from,
    subject: email.subject,
  })
}

function doReplyAll(email: MailMessage) {
  composer.openReplyAll({
    id: email.id,
    threadId: email.threadId,
    from: email.from,
    to: email.to,
    cc: email.cc,
    subject: email.subject,
  })
}

function doForward(email: MailMessage) {
  const full = mailStore.fullEmails[email.id]
  composer.openForward({
    id: email.id,
    threadId: email.threadId,
    subject: email.subject,
    body: full?.textBody ?? '',
  })
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Toolbar -->
    <div class="flex items-center gap-2 px-4 py-2 border-b shrink-0">
      <button class="p-1.5 rounded hover:bg-muted transition-colors" @click="emit('back')">
        <ArrowLeft class="size-4" />
      </button>
      <h2 v-if="emails.length" class="text-sm font-medium truncate flex-1">
        {{ emails[0]?.subject }}
      </h2>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <p class="text-sm text-destructive">{{ error }}</p>
    </div>

    <!-- Thread messages -->
    <div v-else class="flex-1 overflow-y-auto">
      <div class="max-w-3xl mx-auto px-4 py-4 space-y-2">

        <div
          v-for="email in emails"
          :key="email.id"
          class="border rounded-lg overflow-hidden"
        >
          <!-- Collapsed header (click to expand) -->
          <button
            class="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
            @click="toggle(email.id)"
          >
            <div
              class="size-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ring-1 ring-black/5 select-none"
              :style="threadAvatar(email)"
            >
              {{ threadInitials(email) }}
            </div>
            <div class="flex-1 text-left min-w-0">
              <div class="flex items-center gap-2">
                <span :class="['font-medium', !email.isRead && 'text-primary']">
                  {{ senderName(email) }}
                </span>
                <span class="text-xs text-muted-foreground ml-auto shrink-0">
                  {{ formatDate(email.receivedAt) }}
                </span>
              </div>
              <p v-if="!expanded.has(email.id)" class="text-xs text-muted-foreground truncate">
                {{ email.preview }}
              </p>
            </div>
            <component
              :is="expanded.has(email.id) ? ChevronUp : ChevronDown"
              class="size-4 text-muted-foreground shrink-0"
            />
          </button>

          <!-- Expanded body -->
          <div v-if="expanded.has(email.id)" class="border-t px-4 py-4 space-y-4">
            <MailViewer :email-id="email.id" :inline="true" />

            <!-- Per-message actions -->
            <div class="flex items-center gap-2 pt-2 border-t">
              <button
                class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                @click="doReply(email)"
              >
                <Reply class="size-3.5" /> Reply
              </button>
              <button
                class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                @click="doReplyAll(email)"
              >
                <ReplyAll class="size-3.5" /> Reply all
              </button>
              <button
                class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                @click="doForward(email)"
              >
                <Forward class="size-3.5" /> Forward
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
