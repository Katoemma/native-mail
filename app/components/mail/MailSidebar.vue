<script setup lang="ts">
import {
  Archive, ArchiveX, File, Inbox, Send, Trash2,
  Search, PenSquare, ChevronDown,
} from '@lucide/vue'
import type { Mailbox } from '../../../shared/types'

const router = useRouter()
const route = useRoute()
const mailboxesStore = useMailboxesStore()
const sessionStore = useSessionStore()

const mailboxes = computed(() => mailboxesStore.list)

const ROLE_ICONS: Record<string, ReturnType<typeof defineComponent>> = {
  inbox:   Inbox,
  sent:    Send,
  drafts:  File,
  trash:   Trash2,
  junk:    ArchiveX,
  archive: Archive,
}

function iconFor(mb: Mailbox) {
  return mb.role ? ROLE_ICONS[mb.role] ?? File : File
}

function navTo(mb: Mailbox) {
  router.push(`/mail/${mb.role ?? mb.id}`)
}

function isActive(mb: Mailbox) {
  const slug = mb.role ?? mb.id
  return route.params.mailbox === slug
}

const searchQuery = ref('')
function doSearch() {
  if (searchQuery.value.trim()) {
    router.push(`/mail/search?q=${encodeURIComponent(searchQuery.value.trim())}`)
  }
}

const user = computed(() => ({
  name:   sessionStore.displayName ?? sessionStore.username ?? '?',
  email:  sessionStore.email ?? '',
  avatar: '',
}))
</script>

<template>
  <div class="flex flex-col h-full gap-4 p-2">
    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search mail…"
        class="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-ring"
        @keydown.enter="doSearch"
      />
    </div>

    <!-- Compose button -->
    <button
      class="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      @click="$router.push('/mail/compose')"
    >
      <PenSquare class="size-4" />
      Compose
    </button>

    <!-- Mailbox nav -->
    <nav class="flex-1 space-y-0.5 overflow-y-auto">
      <template v-if="mailboxesStore.loading">
        <div v-for="i in 5" :key="i" class="h-8 rounded-md bg-muted/50 animate-pulse mx-1 mb-1" />
      </template>

      <button
        v-for="mb in mailboxes"
        :key="mb.id"
        :class="[
          'flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors',
          isActive(mb)
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : 'hover:bg-sidebar-accent/50 text-sidebar-foreground',
        ]"
        @click="navTo(mb)"
      >
        <component :is="iconFor(mb)" class="size-4 shrink-0" />
        <span class="flex-1 text-left truncate">{{ mb.name }}</span>
        <span
          v-if="mb.unreadEmails > 0"
          class="ml-auto text-xs font-medium tabular-nums bg-primary/10 text-primary px-1.5 rounded-full"
        >
          {{ mb.unreadEmails }}
        </span>
      </button>
    </nav>

    <!-- User footer -->
    <div class="border-t pt-2">
      <div class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 cursor-pointer"
        @click="sessionStore.logout()">
        <div class="size-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {{ user.name.charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ user.name }}</div>
          <div class="text-xs text-muted-foreground truncate">{{ user.email }}</div>
        </div>
        <ChevronDown class="size-3.5 text-muted-foreground shrink-0" />
      </div>
    </div>
  </div>
</template>
