<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

import MailViewer from '@/components/mail/MailViewer.vue'
import MailThread from '@/components/mail/MailThread.vue'

const mailboxesStore = useMailboxesStore()
const mailStore      = useMailStore()
const threadStore    = useThreadStore()
const composer       = useComposerStore()
const route          = useRoute()
const router         = useRouter()
const { setupFocusSync } = useSync()

const mailboxSlug = computed(() => route.params.mailbox as string)

// The selected email ID comes from the query param ?id=xxx
// We use query param instead of nested route to stay flat
const selectedId = computed(() => (route.query.id as string) ?? null)

// Resolve mailbox id and load emails when mailbox changes
const mailboxId = computed(() =>
  mailboxesStore.list.find(m => m.role === mailboxSlug.value || m.id === mailboxSlug.value)?.id ?? null,
)

watch(mailboxId, async (id) => {
  if (id && !mailStore.idsByMailbox[id]?.length) {
    await mailStore.fetchList(id, true)
  }
}, { immediate: true })

onMounted(() => setupFocusSync())

// Selected email data
const selectedEmail = computed(() =>
  selectedId.value ? (mailStore.emails[selectedId.value] ?? null) : null,
)

// Show thread if thread has >1 emails and is loaded
const showThread = computed(() => {
  const tid = selectedEmail.value?.threadId
  if (!tid) return false
  const thread = threadStore.threads[tid]
  return thread ? thread.emailIds.length > 1 : false
})

function goBack() {
  router.push(`/mail/${mailboxSlug.value}`)
}

function handleReply(id: string) {
  const e = mailStore.emails[id]
  if (!e) return
  composer.openReply({ id: e.id, threadId: e.threadId, from: e.from, subject: e.subject })
}

function handleReplyAll(id: string) {
  const e = mailStore.emails[id]
  if (!e) return
  composer.openReplyAll({ id: e.id, threadId: e.threadId, from: e.from, to: e.to, cc: e.cc, subject: e.subject })
}

function handleForward(id: string) {
  const e    = mailStore.emails[id]
  const full = mailStore.fullEmails[id]
  if (!e) return
  composer.openForward({ id: e.id, threadId: e.threadId, subject: e.subject, body: full?.textBody ?? '' })
}
</script>

<template>
  <div class="flex flex-1 overflow-hidden h-full w-full">

    <!-- ── Email viewer / thread ─────────────────────────────── -->
    <MailThread
      v-if="selectedId && showThread && selectedEmail?.threadId"
      :thread-id="selectedEmail.threadId"
      @back="goBack"
      @reply="handleReply"
      @reply-all="handleReplyAll"
      @forward="handleForward"
    />

    <MailViewer
      v-else-if="selectedId"
      :email-id="selectedId"
      @back="goBack"
      @reply="handleReply"
      @reply-all="handleReplyAll"
      @forward="handleForward"
    />

    <!-- ── Empty state ───────────────────────────────────────── -->
    <div
      v-else
      class="flex flex-1 flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none"
    >
      <span class="text-6xl">✉️</span>
      <p class="text-sm font-medium">Select a message to read</p>
      <p class="text-xs">Choose from your {{ mailboxSlug }} on the left</p>
    </div>

  </div>
</template>
