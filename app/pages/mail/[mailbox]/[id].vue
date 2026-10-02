<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

import MailViewer from '@/components/mail/MailViewer.vue'
import MailThread from '@/components/mail/MailThread.vue'

const route          = useRoute()
const router         = useRouter()
const mailStore      = useMailStore()
const mailboxesStore = useMailboxesStore()
const threadStore    = useThreadStore()
const composer       = useComposerStore()

const mailboxSlug = computed(() => route.params.mailbox as string)
const emailId     = computed(() => route.params.id as string)

// Email from store (may not be loaded yet — MailViewer handles its own fetch)
const email = computed(() => mailStore.emails[emailId.value] ?? null)

// Show thread view only if the thread is already loaded AND has >1 messages.
// MailViewer will load the email; we check thread after it's available.
const showThread = computed(() => {
  const threadId = email.value?.threadId
  if (!threadId) return false
  const thread = threadStore.threads[threadId]
  return thread ? thread.emailIds.length > 1 : false
})

// Ensure mailbox emails are loaded (so sidebar panel has data)
const mailboxId = computed(() =>
  mailboxesStore.list.find(m => m.role === mailboxSlug.value || m.id === mailboxSlug.value)?.id ?? null,
)
watch(mailboxId, async (id) => {
  if (id && !mailStore.idsByMailbox[id]?.length) {
    await mailStore.fetchList(id, true)
  }
}, { immediate: true })

// Go back to mailbox empty state
function goBack() {
  router.push(`/mail/${mailboxSlug.value}`)
}

// Composer helpers
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
  <div class="flex flex-1 w-full overflow-hidden h-full">
    <MailThread
      v-if="showThread && email?.threadId"
      class="flex-1 w-full"
      :thread-id="email.threadId"
      @back="goBack"
      @reply="handleReply"
      @reply-all="handleReplyAll"
      @forward="handleForward"
    />

    <MailViewer
      v-else
      class="flex-1 w-full"
      :email-id="emailId"
      @back="goBack"
      @reply="handleReply"
      @reply-all="handleReplyAll"
      @forward="handleForward"
    />
  </div>
</template>
