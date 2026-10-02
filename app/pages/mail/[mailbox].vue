<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

import MailList from '@/components/mail/MailList.vue'
import MailViewer from '@/components/mail/MailViewer.vue'
import MailThread from '@/components/mail/MailThread.vue'
import { useSearch } from '@/composables/useSearch'
import { useSync } from '@/composables/useSync'


const route  = useRouter()
const params = useRoute().params
const query  = useRoute().query

const mailboxSlug = computed(() => params.mailbox as string)
const isSearch    = computed(() => mailboxSlug.value === 'search')

// Stores
const mailboxesStore = useMailboxesStore()
const mailStore      = useMailStore()

// Resolve mailbox id from role slug
const mailboxId = computed(() => {
  if (isSearch.value) return null
  const mb = mailboxesStore.list.find(m => m.role === mailboxSlug.value || m.id === mailboxSlug.value)
  return mb?.id ?? null
})

// Email list for current mailbox
const { emails, loading, hasMore, load, loadMore } = useEmails(
  computed(() => mailboxId.value ?? ''),
)

watch(mailboxId, (id) => {
  if (id) load(true)
}, { immediate: true })

// Search
const { results, total: searchTotal, loading: searchLoading, search, clear } = useSearch()
const searchQuery = ref((query.q as string) ?? '')

watch(() => useRoute().query.q, (q) => {
  searchQuery.value = (q as string) ?? ''
  if (searchQuery.value) search(searchQuery.value)
  else clear()
}, { immediate: true })

// Selected email / thread
const selectedEmailId  = ref<string | null>(null)
const selectedThreadId = ref<string | null>(null)
const showThread       = ref(false)

function selectEmail(id: string) {
  const email = mailStore.emails[id]
  selectedEmailId.value  = id
  selectedThreadId.value = email?.threadId ?? null
  showThread.value       = false
}

function openThread(id: string) {
  selectedThreadId.value = id
  showThread.value       = true
}

function clearSelection() {
  selectedEmailId.value  = null
  selectedThreadId.value = null
  showThread.value       = false
}

// Composer
const composer = useComposerStore()

function handleReply(emailId: string) {
  const email = mailStore.emails[emailId]
  if (!email) return
  composer.openReply({ id: email.id, threadId: email.threadId, from: email.from, subject: email.subject })
}

function handleReplyAll(emailId: string) {
  const email = mailStore.emails[emailId]
  if (!email) return
  composer.openReplyAll({
    id: email.id, threadId: email.threadId,
    from: email.from, to: email.to, cc: email.cc, subject: email.subject,
  })
}

function handleForward(emailId: string) {
  const full = mailStore.fullEmails[emailId]
  const email = mailStore.emails[emailId]
  if (!email) return
  composer.openForward({ id: email.id, threadId: email.threadId, subject: email.subject, body: full?.textBody ?? '' })
}

// Sync on tab focus
const { setupFocusSync } = useSync()
onMounted(() => setupFocusSync())

// Mailbox display name
const mailboxName = computed(() => {
  if (isSearch.value) return 'Search'
  const mb = mailboxesStore.list.find(m => m.role === mailboxSlug.value || m.id === mailboxSlug.value)
  return mb?.name ?? mailboxSlug.value
})

// Display list
const displayEmails = computed(() => isSearch.value ? results.value : emails.value)
const displayLoading = computed(() => isSearch.value ? searchLoading.value : loading.value)
</script>

<template>
  <div class="flex h-full overflow-hidden">

    <!-- Email list panel -->
    <div
      :class="[
        'flex flex-col border-r transition-all shrink-0',
        selectedEmailId ? 'w-80 hidden md:flex' : 'flex-1',
      ]"
    >
      <!-- Panel header -->
      <div class="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h2 class="font-semibold text-sm">{{ mailboxName }}</h2>
        <span v-if="isSearch && searchTotal" class="text-xs text-muted-foreground">
          {{ searchTotal }} result{{ searchTotal !== 1 ? 's' : '' }}
        </span>
        <span v-else-if="!isSearch && mailboxesStore.byRole(mailboxSlug as never)" class="text-xs text-muted-foreground">
          {{ mailboxesStore.byRole(mailboxSlug as never)?.totalEmails ?? '' }}
        </span>
      </div>

      <MailList
        :emails="displayEmails"
        :loading="displayLoading"
        :has-more="!isSearch && hasMore"
        :selected-id="selectedEmailId"
        @select="selectEmail"
        @load-more="loadMore"
      />
    </div>

    <!-- Right panel — viewer or thread -->
    <div v-if="selectedEmailId || showThread" class="flex-1 overflow-hidden">

      <MailThread
        v-if="showThread && selectedThreadId"
        :thread-id="selectedThreadId"
        @back="clearSelection"
        @reply="handleReply"
        @reply-all="handleReplyAll"
        @forward="handleForward"
      />

      <MailViewer
        v-else-if="selectedEmailId"
        :email-id="selectedEmailId"
        @back="clearSelection"
        @reply="handleReply"
        @reply-all="handleReplyAll"
        @forward="handleForward"
      />

    </div>

    <!-- Empty right panel on desktop -->
    <div
      v-else
      class="hidden md:flex flex-1 items-center justify-center text-muted-foreground flex-col gap-3"
    >
      <span class="text-5xl">✉️</span>
      <p class="text-sm">Select a message to read</p>
    </div>

  </div>
</template>
