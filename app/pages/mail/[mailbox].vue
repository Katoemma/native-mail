<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

import MailViewer from '@/components/mail/MailViewer.vue'
import MailThread from '@/components/mail/MailThread.vue'
import MailListItem from '@/components/mail/MailListItem.vue'
import { ArrowLeft } from '@lucide/vue'

const mailboxesStore = useMailboxesStore()
const mailStore      = useMailStore()
const threadStore    = useThreadStore()
const composer       = useComposerStore()
const route          = useRoute()
const router         = useRouter()

const mailboxSlug = computed(() => route.params.mailbox as string)
const selectedId  = computed(() => (route.query.id as string) ?? null)

// Resolve mailbox and load emails
const mailboxId = computed(() =>
  mailboxesStore.list.find(m => m.role === mailboxSlug.value || m.id === mailboxSlug.value)?.id ?? null,
)
const activeMailbox = computed(() =>
  mailboxesStore.list.find(m => m.role === mailboxSlug.value || m.id === mailboxSlug.value) ?? null,
)

watch(mailboxId, async (id) => {
  if (id && !mailStore.idsByMailbox[id]?.length) {
    await mailStore.fetchList(id, true)
  }
}, { immediate: true })

// Mobile email list
const mobileEmails = computed(() => {
  const ids = mailStore.idsByMailbox[mailboxId.value ?? ''] ?? []
  return ids.map(id => mailStore.emails[id]).filter(Boolean)
})
const mobileLoading = computed(() => mailStore.loadingList)

function selectEmail(id: string) {
  router.push({ path: `/mail/${mailboxSlug.value}`, query: { id } })
}

// Thread / viewer state
const selectedEmail = computed(() =>
  selectedId.value ? (mailStore.emails[selectedId.value] ?? null) : null,
)
const showThread = computed(() => {
  const tid = selectedEmail.value?.threadId
  if (!tid) return false
  const thread = threadStore.threads[tid]
  return thread ? thread.emailIds.length > 1 : false
})

function goBack() {
  // On mobile: if an email is open, go back to the list
  // On desktop: go back to the empty state
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

    <!--
      ── MOBILE: email list (shown when no email selected) ───────────────
      Hidden on md+ because the list lives in AppSidebar's second panel.
    -->
    <div
      v-if="!selectedId"
      class="flex flex-col w-full h-full md:hidden"
    >
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <h2 class="font-semibold text-base">
          {{ activeMailbox?.name ?? mailboxSlug }}
        </h2>
        <span
          v-if="activeMailbox?.unreadEmails"
          class="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold"
        >
          {{ activeMailbox.unreadEmails }}
        </span>
      </div>

      <!-- Loading -->
      <div v-if="mobileLoading && !mobileEmails.length" class="flex-1 overflow-y-auto">
        <div v-for="i in 6" :key="i" class="flex flex-col gap-2 border-b px-4 py-3">
          <div class="flex gap-2">
            <div class="h-3 w-28 rounded bg-muted animate-pulse" />
            <div class="ml-auto h-3 w-10 rounded bg-muted animate-pulse" />
          </div>
          <div class="h-3 w-44 rounded bg-muted animate-pulse" />
          <div class="h-3 w-56 rounded bg-muted animate-pulse" />
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="!mobileLoading && !mobileEmails.length"
        class="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground"
      >
        <span class="text-4xl">📭</span>
        <p class="text-sm">No messages here</p>
      </div>

      <!-- List -->
      <div v-else class="flex-1 overflow-y-auto">
        <MailListItem
          v-for="email in mobileEmails"
          :key="email.id"
          :email="email"
          :active="false"
          @click="selectEmail"
          @star="(id, val) => mailStore.markStarred(id, val)"
        />
      </div>
    </div>

    <!--
      ── VIEWER (both mobile when email selected, and desktop always) ─────
      On mobile: only when ?id= is present
      On desktop: always (empty state shown when no ?id=)
    -->
    <div
      :class="[
        'flex flex-col flex-1 overflow-hidden h-full',
        // Mobile: only show viewer when email is selected
        selectedId ? 'flex' : 'hidden md:flex',
      ]"
    >
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

      <!-- Desktop empty state (no email selected) -->
      <div
        v-else
        class="flex flex-1 flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none"
      >
        <span class="text-6xl">✉️</span>
        <p class="text-sm font-medium">Select a message to read</p>
        <p class="text-xs">Choose from your {{ mailboxSlug }} on the left</p>
      </div>
    </div>

  </div>
</template>
