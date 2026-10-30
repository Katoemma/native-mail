<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

import MailViewer from '@/components/mail/MailViewer.vue'
import MailThread from '@/components/mail/MailThread.vue'
import MailListItem from '@/components/mail/MailListItem.vue'
import { Search } from '@lucide/vue'

const mailStore      = useMailStore()
const mailboxesStore = useMailboxesStore()
const threadStore    = useThreadStore()
const composer       = useComposerStore()
const route          = useRoute()
const router         = useRouter()
const { results, total, loading, error } = useSearch()
useDebouncedMailSearch(350)

const selectedId = computed(() => (route.query.id as string) ?? null)
const q = computed(() => (route.query.q as string) ?? '')

const showListPane = computed(() => !selectedId.value)
const showReaderPane = computed(() => !!selectedId.value)

function selectEmail(id: string) {
  router.push({ path: '/mail/search', query: { q: q.value, id } })
}

async function onRowArchive(id: string) {
  const archiveId = mailboxesStore.byRole('archive')?.id
  if (archiveId) await mailStore.move(id, archiveId)
}

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
  router.push({ path: '/mail/search', query: { q: q.value } })
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
  <div class="flex h-full w-full flex-1 overflow-hidden">
    <div
      v-if="showListPane"
      class="flex h-full w-full flex-col"
    >
      <div class="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <Search class="size-4 shrink-0 text-muted-foreground" :stroke-width="1.75" />
        <div class="min-w-0">
          <h2 class="truncate text-base font-semibold">Search</h2>
          <p v-if="q" class="truncate text-xs text-muted-foreground">
            “{{ q }}” · {{ total }} result{{ total === 1 ? '' : 's' }}
          </p>
        </div>
      </div>

      <div v-if="loading && !results.length" class="flex-1 overflow-y-auto">
        <div v-for="i in 6" :key="i" class="flex gap-3 border-b px-4 py-3">
          <div class="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
          <div class="flex-1 space-y-2">
            <div class="h-3 w-28 animate-pulse rounded bg-muted" />
            <div class="h-3 w-44 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>

      <div
        v-else-if="error"
        class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-destructive"
      >
        <p class="text-sm font-medium">{{ error }}</p>
      </div>

      <div
        v-else-if="!loading && !results.length"
        class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground"
      >
        <Search class="size-8 opacity-40" :stroke-width="1.5" />
        <p class="text-sm">{{ q ? 'No messages found' : 'Search your mail' }}</p>
      </div>

      <div v-else class="flex-1 overflow-y-auto">
        <MailListItem
          v-for="email in results"
          :key="email.id"
          :email="email"
          :active="false"
          show-actions
          @click="selectEmail"
          @star="(id, val) => mailStore.markStarred(id, val)"
          @trash="(id) => mailStore.trash(id)"
          @archive="onRowArchive"
          @mark-read="(id, read) => mailStore.markRead(id, read)"
        />
      </div>
    </div>

    <div
      v-if="showReaderPane"
      class="flex h-full flex-1 flex-col overflow-hidden"
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
    </div>
  </div>
</template>
