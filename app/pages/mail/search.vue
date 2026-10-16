<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

import MailViewer from '@/components/mail/MailViewer.vue'
import MailThread from '@/components/mail/MailThread.vue'
import MailListItem from '@/components/mail/MailListItem.vue'
import { Search } from '@lucide/vue'

const mailStore   = useMailStore()
const threadStore = useThreadStore()
const composer    = useComposerStore()
const route       = useRoute()
const router      = useRouter()
const { query, results, total, loading, error, search } = useSearch()

const selectedId = computed(() => (route.query.id as string) ?? null)
const q = computed(() => (route.query.q as string) ?? '')

watch(q, (val) => {
  if (val && val !== query.value) void search(val)
  else if (val && !results.value.length && !loading.value) void search(val)
}, { immediate: true })

function selectEmail(id: string) {
  router.push({ path: '/mail/search', query: { q: q.value, id } })
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
  <div class="flex flex-1 overflow-hidden h-full w-full">
    <!-- Mobile results list -->
    <div
      v-if="!selectedId"
      class="flex flex-col w-full h-full md:hidden"
    >
      <div class="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <Search class="size-4 text-muted-foreground shrink-0" :stroke-width="1.75" />
        <div class="min-w-0">
          <h2 class="font-semibold text-base truncate">Search</h2>
          <p v-if="q" class="text-xs text-muted-foreground truncate">
            “{{ q }}” · {{ total }} result{{ total === 1 ? '' : 's' }}
          </p>
        </div>
      </div>

      <div v-if="loading && !results.length" class="flex-1 overflow-y-auto">
        <div v-for="i in 6" :key="i" class="flex gap-3 border-b px-4 py-3">
          <div class="size-10 shrink-0 rounded-full bg-muted animate-pulse" />
          <div class="flex-1 space-y-2">
            <div class="h-3 w-28 rounded bg-muted animate-pulse" />
            <div class="h-3 w-44 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>

      <div
        v-else-if="error"
        class="flex-1 flex flex-col items-center justify-center gap-2 text-destructive px-6 text-center"
      >
        <p class="text-sm font-medium">{{ error }}</p>
      </div>

      <div
        v-else-if="!loading && !results.length"
        class="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground px-6 text-center"
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
          @click="selectEmail"
          @star="(id, val) => mailStore.markStarred(id, val)"
        />
      </div>
    </div>

    <!-- Viewer -->
    <div
      :class="[
        'flex flex-col flex-1 overflow-hidden h-full',
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

      <div
        v-else
        class="flex flex-1 flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none"
      >
        <Search class="size-12 opacity-30" :stroke-width="1.25" />
        <p class="text-sm font-medium">
          {{ q ? `${total} result${total === 1 ? '' : 's'} for “${q}”` : 'Search your mail' }}
        </p>
        <p class="text-xs">Choose a message from the results on the left</p>
      </div>
    </div>
  </div>
</template>
