<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

import MailViewer from '@/components/mail/MailViewer.vue'
import MailThread from '@/components/mail/MailThread.vue'
import MailListItem from '@/components/mail/MailListItem.vue'
import MailPagination from '@/components/mail/MailPagination.vue'
import { Check, Trash2, X, Loader2, Undo2 } from '@lucide/vue'
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

const mailboxesStore = useMailboxesStore()
const mailStore      = useMailStore()
const threadStore    = useThreadStore()
const composer       = useComposerStore()
const route          = useRoute()
const router         = useRouter()
const { isList, isSplit } = useMailLayout()

const {
  selected: selectedIds,
  count: selectedCount,
  hasSelection,
  isSelected,
  toggle: toggleSelect,
  toggleAll,
  clear: clearSelection,
} = useMailSelection()

const STARRED_KEY = 'starred'

const mailboxSlug = computed(() => route.params.mailbox as string)
const selectedId  = computed(() => (route.query.id as string) ?? null)
const isStarredView = computed(() => mailboxSlug.value === STARRED_KEY)

/** Full-width list visible (list mode, or mobile split when nothing selected). */
const showListPane = computed(() => {
  if (isList.value) return !selectedId.value
  return !selectedId.value
})

/** Reading pane: list mode only when a message is open; split mode always on md+. */
const showReaderPane = computed(() => {
  if (isList.value) return !!selectedId.value
  return true
})

/** Real mailbox id, or virtual "starred" list key */
const mailboxId = computed(() => {
  if (isStarredView.value) return STARRED_KEY
  return mailboxesStore.list.find(m => m.role === mailboxSlug.value || m.id === mailboxSlug.value)?.id ?? null
})
const activeMailbox = computed(() =>
  isStarredView.value
    ? null
    : mailboxesStore.list.find(m => m.role === mailboxSlug.value || m.id === mailboxSlug.value) ?? null,
)
const folderTitle = computed(() =>
  isStarredView.value ? 'Starred' : (activeMailbox.value?.name ?? mailboxSlug.value),
)

const isTrashFolder = computed(() => mailboxSlug.value === 'trash')

watch(mailboxId, async (id) => {
  clearSelection()
  if (!id) return
  if (!isStarredView.value) mailboxesStore.select(id)
  if (!mailStore.idsByMailbox[id]?.length) {
    await mailStore.fetchList(id, true)
  }
}, { immediate: true })

const mobileEmails = computed(() => {
  const ids = mailStore.idsByMailbox[mailboxId.value ?? ''] ?? []
  return ids.map(id => mailStore.emails[id]).filter(Boolean)
})
const mobileLoading = computed(() => mailStore.loadingList)
const mobileIds = computed(() => mobileEmails.value.map(e => e.id))
const allVisibleSelected = computed(() =>
  mobileIds.value.length > 0 && mobileIds.value.every(id => selectedIds.value.includes(id)),
)
const pageInfo = computed(() =>
  mailboxId.value
    ? mailStore.pageInfo(mailboxId.value)
    : { start: 0, end: 0, total: 0, page: 0, canPrev: false, canNext: false },
)

async function goPrevPage() {
  if (!mailboxId.value) return
  clearSelection()
  await mailStore.fetchPrevPage(mailboxId.value)
}

async function goNextPage() {
  if (!mailboxId.value) return
  clearSelection()
  await mailStore.fetchNextPage(mailboxId.value)
}

function selectEmail(id: string) {
  if (hasSelection.value) {
    toggleSelect(id)
    return
  }
  router.push({ path: `/mail/${mailboxSlug.value}`, query: { id } })
}

const bulkBusy = ref(false)
const bulkConfirmOpen = ref(false)

async function runBulkTrash() {
  if (!selectedIds.value.length || bulkBusy.value) return
  bulkBusy.value = true
  const ids = [...selectedIds.value]
  try {
    if (isTrashFolder.value) {
      await Promise.all(ids.map(id => mailStore.destroy(id)))
    }
    else {
      await Promise.all(ids.map(id => mailStore.trash(id)))
    }
    clearSelection()
  }
  finally {
    bulkBusy.value = false
    bulkConfirmOpen.value = false
  }
}

async function runBulkRestore() {
  if (!selectedIds.value.length || bulkBusy.value) return
  const inboxId = mailboxesStore.inbox?.id
  if (!inboxId) return
  bulkBusy.value = true
  try {
    await Promise.all(selectedIds.value.map(id => mailStore.move(id, inboxId)))
    clearSelection()
  }
  finally {
    bulkBusy.value = false
  }
}

async function onRowTrash(id: string) {
  if (isTrashFolder.value) await mailStore.destroy(id)
  else await mailStore.trash(id)
}

async function onRowArchive(id: string) {
  const archiveId = mailboxesStore.byRole('archive')?.id
  if (archiveId) await mailStore.move(id, archiveId)
}

function onRowMarkRead(id: string, read: boolean) {
  void mailStore.markRead(id, read)
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
    <!-- Message list: full-width in list mode; mobile-only in split mode -->
    <div
      v-if="showListPane"
      :class="[
        'flex flex-col w-full h-full',
        isSplit ? 'md:hidden' : 'flex',
      ]"
    >
      <div class="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <template v-if="hasSelection">
          <button
            type="button"
            class="flex size-5 shrink-0 items-center justify-center rounded border transition-colors"
            :class="allVisibleSelected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/40 bg-background'"
            :aria-label="allVisibleSelected ? 'Deselect all' : 'Select all'"
            @click="toggleAll(mobileIds)"
          >
            <Check v-if="allVisibleSelected" class="size-3.5" :stroke-width="2.5" />
          </button>
          <span class="shrink-0 text-sm font-medium tabular-nums whitespace-nowrap">
            {{ selectedCount }} selected
          </span>
          <div class="ml-auto flex shrink-0 items-center gap-0.5">
            <button
              v-if="isTrashFolder"
              type="button"
              class="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              :disabled="bulkBusy"
              :aria-label="'Restore'"
              @click="runBulkRestore"
            >
              <Loader2 v-if="bulkBusy" class="size-4 shrink-0 animate-spin" />
              <Undo2 v-else class="size-4 shrink-0" />
              <span class="hidden xs:inline sm:inline">Restore</span>
            </button>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              :disabled="bulkBusy"
              :aria-label="isTrashFolder ? 'Delete' : 'Trash'"
              @click="isTrashFolder ? (bulkConfirmOpen = true) : runBulkTrash()"
            >
              <Loader2 v-if="bulkBusy" class="size-4 shrink-0 animate-spin" />
              <Trash2 v-else class="size-4 shrink-0" />
              <span class="hidden sm:inline">{{ isTrashFolder ? 'Delete' : 'Trash' }}</span>
            </button>
            <button
              type="button"
              class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Clear selection"
              @click="clearSelection"
            >
              <X class="size-4" />
            </button>
          </div>
        </template>
        <template v-else>
          <h2 class="font-semibold text-base">
            {{ folderTitle }}
          </h2>
          <span
            v-if="activeMailbox?.unreadEmails"
            class="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold"
          >
            {{ activeMailbox.unreadEmails }}
          </span>
          <MailPagination
            :info="pageInfo"
            :loading="mobileLoading"
            @prev="goPrevPage"
            @next="goNextPage"
          />
        </template>
      </div>

      <div v-if="mobileLoading && !mobileEmails.length" class="flex-1 overflow-y-auto">
        <div
          v-for="i in 8"
          :key="i"
          class="flex h-10 items-center gap-2 border-b px-3"
        >
          <div class="size-4 rounded border border-muted animate-pulse" />
          <div class="size-4 rounded bg-muted animate-pulse" />
          <div class="hidden h-3 w-36 rounded bg-muted animate-pulse sm:block" />
          <div class="h-3 flex-1 rounded bg-muted animate-pulse" />
          <div class="h-3 w-12 rounded bg-muted animate-pulse" />
        </div>
      </div>

      <div
        v-else-if="!mobileLoading && !mobileEmails.length"
        class="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground"
      >
        <p class="text-sm">No messages here</p>
      </div>

      <div v-else class="flex-1 overflow-y-auto">
        <MailListItem
          v-for="email in mobileEmails"
          :key="email.id"
          :email="email"
          :active="false"
          selectable
          show-actions
          :selected="isSelected(email.id)"
          @click="selectEmail"
          @toggle-select="toggleSelect"
          @star="(id, val) => mailStore.markStarred(id, val)"
          @trash="onRowTrash"
          @archive="onRowArchive"
          @mark-read="onRowMarkRead"
        />
      </div>
    </div>

    <!-- Reading pane -->
    <div
      v-if="showReaderPane"
      :class="[
        'flex flex-col flex-1 overflow-hidden h-full',
        isList
          ? 'flex'
          : (selectedId ? 'flex' : 'hidden md:flex'),
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
        v-else-if="isSplit"
        class="flex flex-1 flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none"
      >
        <p class="text-sm font-medium">Select a message to read</p>
        <p class="text-xs">Choose from your {{ mailboxSlug }} on the left</p>
      </div>
    </div>

    <AlertDialog v-model:open="bulkConfirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            {{ selectedCount }} message{{ selectedCount === 1 ? '' : 's' }} will be permanently deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="bulkBusy">Cancel</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-white hover:bg-destructive/90"
            :disabled="bulkBusy"
            @click.prevent="runBulkTrash"
          >
            {{ bulkBusy ? 'Deleting…' : 'Delete forever' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
