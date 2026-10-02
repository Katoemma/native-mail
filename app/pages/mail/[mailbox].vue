<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

const mailboxesStore = useMailboxesStore()
const mailStore      = useMailStore()
const route          = useRoute()
const { setupFocusSync } = useSync()

const mailboxSlug = computed(() => route.params.mailbox as string)

// Resolve mailbox id from role slug and load emails into the store
// so the AppSidebar second panel has data to render
const mailboxId = computed(() =>
  mailboxesStore.list.find(m => m.role === mailboxSlug.value || m.id === mailboxSlug.value)?.id ?? null,
)

watch(mailboxId, async (id) => {
  if (id && !mailStore.idsByMailbox[id]?.length) {
    await mailStore.fetchList(id, true)
  }
}, { immediate: true })

// Wire up tab-focus sync
onMounted(() => setupFocusSync())
</script>

<template>
  <!-- Empty state — shown when no email is selected -->
  <div class="flex flex-1 flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none">
    <span class="text-6xl">✉️</span>
    <p class="text-sm font-medium">Select a message to read</p>
    <p class="text-xs">Choose from your {{ mailboxSlug }} on the left</p>
  </div>
</template>
