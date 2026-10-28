<script setup lang="ts">
import {
  Inbox, FilePenLine, SendHorizontal, ShieldAlert, Trash2,
  SquarePen, Star, Check, X, Loader2, Undo2,
} from '@lucide/vue'
import logoUrl from '~/assets/images/logo.png'
import { avatarStyle, senderInitials } from '~/utils/avatar'
import MailPagination from '@/components/mail/MailPagination.vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
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
import type { HTMLAttributes } from 'vue'
import type { MailboxRole } from '../../shared/types'

interface SidebarProps {
  side?: 'left' | 'right'
  variant?: 'sidebar' | 'floating' | 'inset'
  collapsible?: 'offcanvas' | 'icon' | 'none'
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: 'icon',
})

// ── Stores ────────────────────────────────────────────────────────────────────
const mailboxesStore = useMailboxesStore()
const mailStore      = useMailStore()
const composer       = useComposerStore()
const router         = useRouter()
const route          = useRoute()

const { setOpen, setOpenMobile, isMobile, open: sidebarOpen } = useSidebar()
const { isSplit, isList } = useMailLayout()

/** Desktop list mode: when expanded, show folder labels (not just icons). */
const showNavLabels = computed(() => isMobile.value || (isList.value && sidebarOpen.value))

function closeMobileSidebar() {
  if (isMobile.value) setOpenMobile(false)
}

// Close the mobile drawer after any route change (folder, email, search, etc.)
watch(() => route.fullPath, () => {
  closeMobileSidebar()
})

// ── Nav items — roles map to routes ──────────────────────────────────────────
const navItems = [
  { title: 'Inbox',  role: 'inbox'  as MailboxRole, icon: Inbox,          url: '/mail/inbox'  },
  { title: 'Drafts', role: 'drafts' as MailboxRole, icon: FilePenLine,    url: '/mail/drafts' },
  { title: 'Sent',   role: 'sent'   as MailboxRole, icon: SendHorizontal, url: '/mail/sent'   },
  { title: 'Spam',   role: 'junk'   as MailboxRole, icon: ShieldAlert,    url: '/mail/junk'   },
  { title: 'Trash',  role: 'trash'  as MailboxRole, icon: Trash2,         url: '/mail/trash'  },
]

// Active item derived from current route
const activeRole = computed(() => route.params.mailbox as string ?? 'inbox')

// ── Second panel — mail list for the active mailbox ───────────────────────────
const activeMailbox = computed(() =>
  mailboxesStore.list.find(m => m.role === activeRole.value || m.id === activeRole.value) ?? null,
)

// Unread filter toggle
const showUnreadOnly = ref(false)

// Emails shown in the second panel
const panelEmails = computed(() => {
  const ids = mailStore.idsByMailbox[activeMailbox.value?.id ?? ''] ?? []
  const all = ids.map(id => mailStore.emails[id]).filter(Boolean)
  return showUnreadOnly.value ? all.filter(e => !e.isRead) : all
})

const panelLoading = computed(() => mailStore.loadingList)

const panelPageInfo = computed(() => {
  const id = activeMailbox.value?.id
  return id
    ? mailStore.pageInfo(id)
    : { start: 0, end: 0, total: 0, page: 0, canPrev: false, canNext: false }
})

async function goPrevPage() {
  const id = activeMailbox.value?.id
  if (!id) return
  clearSelection()
  await mailStore.fetchPrevPage(id)
}

async function goNextPage() {
  const id = activeMailbox.value?.id
  if (!id) return
  clearSelection()
  await mailStore.fetchNextPage(id)
}

// ── Navigation click ─────────────────────────────────────────────────────────
function navTo(role: string, url: string) {
  // Close the mobile drawer immediately — don't wait for fetch/navigation
  closeMobileSidebar()
  // Split mode: keep the mail-list panel open after folder change
  if (!isMobile.value && isSplit.value) setOpen(true)

  void router.push(url)

  // Prefetch mailbox in the background after the drawer starts closing
  const mb = mailboxesStore.list.find(m => m.role === role)
  if (mb && !mailStore.idsByMailbox[mb.id]?.length) {
    void mailStore.fetchList(mb.id, true)
  }
}

// ── Select an email from the panel ───────────────────────────────────────────
function selectMail(emailId: string) {
  closeMobileSidebar()
  if (isSearchMode.value) {
    void router.push({
      path: '/mail/search',
      query: { q: searchQuery.value.trim(), id: emailId },
    })
    return
  }
  void router.push({ path: `/mail/${activeRole.value}`, query: { id: emailId } })
}

const panelList = computed(() =>
  isSearchMode.value ? searchResults.value : panelEmails.value,
)
const panelIsLoading = computed(() =>
  isSearchMode.value ? searchLoading.value : panelLoading.value,
)

// ── Search (debounced commit is owned by the layout via useDebouncedMailSearch) ─
const {
  query: searchQuery,
  results: searchResults,
  total: searchTotal,
  loading: searchLoading,
  error: searchError,
} = useSearch()

const { searchNow } = useDebouncedMailSearch(350)

const isSearchMode = computed(() => route.path === '/mail/search')

const {
  selected: selectedIds,
  count: selectedCount,
  hasSelection,
  isSelected,
  toggle: toggleSelect,
  toggleAll,
  clear: clearSelection,
} = useMailSelection()

const isTrashFolder = computed(() => activeRole.value === 'trash')
const panelIds = computed(() => panelList.value.map(m => m.id))
const allVisibleSelected = computed(() =>
  panelIds.value.length > 0 && panelIds.value.every(id => selectedIds.value.includes(id)),
)

const bulkBusy = ref(false)
const bulkConfirmOpen = ref(false)

watch(() => route.params.mailbox, () => clearSelection())
watch(isSearchMode, () => clearSelection())

function leaveIfOpenRemoved(ids: string[]) {
  if (route.query.id && ids.includes(route.query.id as string)) {
    void router.push(isSearchMode.value
      ? { path: '/mail/search', query: { q: searchQuery.value.trim() } }
      : `/mail/${activeRole.value}`)
  }
}

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
    leaveIfOpenRemoved(ids)
  }
  finally {
    bulkBusy.value = false
    bulkConfirmOpen.value = false
  }
}

/** Restore selected messages from Trash → Inbox */
async function runBulkRestore() {
  if (!selectedIds.value.length || bulkBusy.value) return
  const inboxId = mailboxesStore.inbox?.id
  if (!inboxId) return
  bulkBusy.value = true
  const ids = [...selectedIds.value]
  try {
    await Promise.all(ids.map(id => mailStore.move(id, inboxId)))
    clearSelection()
    leaveIfOpenRemoved(ids)
  }
  finally {
    bulkBusy.value = false
  }
}

function openCompose() {
  closeMobileSidebar()
  composer.openCompose()
}

// ── Format date ───────────────────────────────────────────────────────────────
function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d   = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86_400_000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 7 * 86_400_000)
    return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function mailInitials(mail: { from: { name?: string | null; email: string }[] }) {
  const f = mail.from[0]
  return senderInitials(f?.name, f?.email)
}

function mailAvatarStyle(mail: { from: { name?: string | null; email: string }[] }) {
  const f = mail.from[0]
  return avatarStyle(f?.email || f?.name || '?')
}
</script>

<template>
  <Sidebar
    class="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
    v-bind="props"
  >
    <!-- ── First sidebar: labeled when open (list mode) / icon rail when collapsed ─ -->
    <Sidebar
      collapsible="none"
      :class="[
        'w-full border-r',
        isList
          ? 'md:w-full'
          : 'md:w-[calc(var(--sidebar-width-icon)+1px)]!',
      ]"
    >
      <SidebarHeader :class="['gap-2', showNavLabels ? 'px-3' : 'px-3 md:px-2']">
        <NuxtLink
          v-if="showNavLabels"
          to="/mail/inbox"
          class="block px-1 py-1"
          aria-label="Native Mail"
          @click="closeMobileSidebar()"
        >
          <img
            :src="logoUrl"
            alt="Native"
            class="h-7 w-auto"
            width="640"
            height="200"
          >
        </NuxtLink>

        <TooltipProvider :delay-duration="200">
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                type="button"
                :class="[
                  'inline-flex shrink-0 items-center gap-3 bg-primary text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.98]',
                  showNavLabels
                    ? 'h-14 w-full max-w-[9.5rem] rounded-2xl px-4 text-sm font-medium'
                    : 'size-10 justify-center rounded-2xl md:size-10',
                ]"
                aria-label="Compose"
                @click="openCompose()"
              >
                <SquarePen class="size-5 shrink-0" :stroke-width="1.75" />
                <span v-if="showNavLabels">Compose</span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              align="center"
              :hidden="showNavLabels"
            >
              Compose
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup :class="showNavLabels ? 'px-2' : 'px-2 md:px-0'">
          <SidebarGroupContent>
            <TooltipProvider :delay-duration="200">
              <SidebarMenu class="gap-1">
                <SidebarMenuItem v-for="item in navItems" :key="item.title">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <SidebarMenuButton
                        :is-active="activeRole === item.role"
                        :class="[
                          'relative h-11 gap-3 px-3 font-normal data-[active=true]:font-normal',
                          showNavLabels
                            ? ''
                            : 'md:h-8 md:justify-center md:gap-2 md:px-2',
                        ]"
                        @click="navTo(item.role!, item.url)"
                      >
                        <component
                          :is="item.icon"
                          class="size-[18px] shrink-0"
                          :stroke-width="1.75"
                        />
                        <span
                          :class="[
                            'truncate text-[0.9375rem] font-normal tracking-tight',
                            showNavLabels ? '' : 'md:sr-only',
                          ]"
                        >
                          {{ item.title }}
                        </span>
                        <span
                          v-if="mailboxesStore.byRole(item.role!)?.unreadEmails"
                          :class="[
                            'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold tabular-nums text-primary-foreground',
                            showNavLabels
                              ? ''
                              : 'md:absolute md:top-1 md:right-1 md:ml-0 md:size-4 md:min-w-0 md:px-0',
                          ]"
                        >
                          {{ mailboxesStore.byRole(item.role!)!.unreadEmails! > 9
                            ? '9+'
                            : mailboxesStore.byRole(item.role!)?.unreadEmails }}
                        </span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      align="center"
                      :hidden="showNavLabels"
                    >
                      {{ item.title }}
                      <span
                        v-if="mailboxesStore.byRole(item.role!)?.unreadEmails"
                        class="ml-1.5 text-muted-foreground"
                      >
                        · {{ mailboxesStore.byRole(item.role!)?.unreadEmails }} unread
                      </span>
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              </SidebarMenu>
            </TooltipProvider>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>

    <!-- ── Second sidebar: mail list panel (split / classic layout only) ─ -->
    <Sidebar
      v-if="isSplit"
      collapsible="none"
      class="hidden min-w-0 flex-1 md:flex"
    >
      <SidebarHeader class="gap-3.5 border-b p-4">
        <div class="flex w-full items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="text-base font-medium text-foreground truncate">
              {{ isSearchMode ? 'Search' : (activeMailbox?.name ?? activeRole) }}
            </div>
            <p
              v-if="isSearchMode && searchQuery.trim()"
              class="text-xs text-muted-foreground truncate"
            >
              “{{ searchQuery.trim() }}” · {{ searchTotal }} result{{ searchTotal === 1 ? '' : 's' }}
            </p>
          </div>
          <div
            v-if="!isSearchMode && !hasSelection"
            class="flex shrink-0 items-center gap-2"
          >
            <Label class="hidden items-center gap-2 text-sm lg:flex">
              <span>Unreads</span>
              <Switch v-model:checked="showUnreadOnly" class="shadow-none" />
            </Label>
            <MailPagination
              :info="panelPageInfo"
              :loading="panelLoading"
              @prev="goPrevPage"
              @next="goNextPage"
            />
          </div>
        </div>

        <!-- Bulk selection bar — under folder title, not in the message toolbar -->
        <div
          v-if="hasSelection"
          class="flex w-full min-w-0 items-center gap-2 rounded-lg border bg-muted/40 px-2 py-1.5"
        >
          <button
            type="button"
            class="flex size-5 shrink-0 items-center justify-center rounded border transition-colors"
            :class="allVisibleSelected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/40 bg-background'"
            :aria-label="allVisibleSelected ? 'Deselect all' : 'Select all'"
            @click="toggleAll(panelIds)"
          >
            <Check v-if="allVisibleSelected" class="size-3.5" :stroke-width="2.5" />
          </button>
          <span class="shrink-0 text-xs font-medium tabular-nums whitespace-nowrap">
            {{ selectedCount }} selected
          </span>
          <div class="ml-auto flex shrink-0 items-center gap-0.5">
            <Tooltip v-if="isTrashFolder">
              <TooltipTrigger as-child>
                <button
                  type="button"
                  class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  :disabled="bulkBusy"
                  @click="runBulkRestore"
                >
                  <Loader2 v-if="bulkBusy" class="size-3.5 shrink-0 animate-spin" />
                  <Undo2 v-else class="size-3.5 shrink-0" />
                  <span class="hidden sm:inline">Restore</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Restore to Inbox</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  type="button"
                  class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  :disabled="bulkBusy"
                  @click="isTrashFolder ? (bulkConfirmOpen = true) : runBulkTrash()"
                >
                  <Loader2 v-if="bulkBusy" class="size-3.5 shrink-0 animate-spin" />
                  <Trash2 v-else class="size-3.5 shrink-0" />
                  <span class="hidden sm:inline">{{ isTrashFolder ? 'Delete' : 'Trash' }}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{{ isTrashFolder ? 'Delete forever' : 'Move to Trash' }}</TooltipContent>
            </Tooltip>
            <button
              type="button"
              class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear selection"
              @click="clearSelection"
            >
              <X class="size-3.5" />
            </button>
          </div>
        </div>

        <Input
          v-else
          v-model="searchQuery"
          type="search"
          class="bg-background h-8 w-full shadow-none"
          placeholder="Type to search..."
          autocomplete="off"
          @keydown.enter.prevent="searchNow"
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup class="px-0">
          <SidebarGroupContent>
            <!-- Loading skeletons -->
            <template v-if="panelIsLoading && !panelList.length">
              <div v-for="i in 6" :key="i" class="flex gap-3 border-b p-4">
                <div class="size-9 shrink-0 rounded-full bg-muted animate-pulse" />
                <div class="flex-1 space-y-2">
                  <div class="flex gap-2">
                    <div class="h-2.5 w-24 rounded bg-muted animate-pulse" />
                    <div class="ml-auto h-2.5 w-10 rounded bg-muted animate-pulse" />
                  </div>
                  <div class="h-2.5 w-40 rounded bg-muted animate-pulse" />
                  <div class="h-2.5 w-56 rounded bg-muted animate-pulse" />
                </div>
              </div>
            </template>

            <!-- Empty / error -->
            <div
              v-else-if="isSearchMode && searchError"
              class="flex flex-col items-center justify-center py-12 text-destructive gap-2 px-4 text-center"
            >
              <p class="text-xs font-medium">{{ searchError }}</p>
            </div>
            <div
              v-else-if="!panelIsLoading && !panelList.length"
              class="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2"
            >
              <span class="text-3xl">{{ isSearchMode ? '🔍' : '📭' }}</span>
              <p class="text-xs">
                {{ isSearchMode
                  ? (searchQuery.trim() ? 'No messages found' : 'Search your mail')
                  : 'No messages' }}
              </p>
            </div>

            <!-- Mail list -->
            <div
              v-for="mail in panelList"
              :key="mail.id"
              role="button"
              tabindex="0"
              :class="[
                'group/mail relative w-full min-w-0 overflow-hidden text-left flex gap-3 border-b px-4 py-3.5 text-sm leading-tight last:border-b-0 transition-colors cursor-pointer',
                route.query.id === mail.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/50',
                !mail.isRead && route.query.id !== mail.id && 'bg-primary/[0.04]',
                isSelected(mail.id) && 'bg-primary/8',
              ]"
              @click="selectMail(mail.id)"
              @keydown.enter.prevent="selectMail(mail.id)"
            >
              <span
                v-if="!mail.isRead"
                class="absolute inset-y-0 left-0 w-0.5 bg-primary"
              />

              <button
                type="button"
                class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors"
                :class="isSelected(mail.id)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/40 bg-background'"
                :aria-label="isSelected(mail.id) ? 'Deselect' : 'Select'"
                :aria-pressed="isSelected(mail.id)"
                @click.stop="toggleSelect(mail.id)"
              >
                <Check v-if="isSelected(mail.id)" class="size-3.5" :stroke-width="2.5" />
              </button>

              <div
                class="size-9 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold select-none ring-1 ring-black/5"
                :style="mailAvatarStyle(mail)"
                aria-hidden="true"
              >
                {{ mailInitials(mail) }}
              </div>

              <div class="min-w-0 flex-1 flex flex-col gap-0.5">
                <div class="flex w-full min-w-0 items-center gap-2">
                  <span
                    v-if="!mail.isRead"
                    class="size-1.5 rounded-full bg-primary shrink-0"
                  />
                  <span
                    :class="[
                      'truncate min-w-0 flex-1',
                      mail.isRead ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground',
                    ]"
                  >
                    {{ mail.from[0]?.name || mail.from[0]?.email || '(unknown)' }}
                  </span>
                  <Star
                    v-if="mail.isStarred"
                    class="size-3 fill-amber-400 text-amber-400 shrink-0"
                  />
                  <span
                    :class="[
                      'text-xs whitespace-nowrap shrink-0 tabular-nums',
                      mail.isRead ? 'text-muted-foreground' : 'text-foreground/70 font-medium',
                    ]"
                  >
                    {{ formatDate(mail.receivedAt) }}
                  </span>
                </div>
                <span
                  :class="[
                    'truncate min-w-0',
                    mail.isRead ? 'font-normal text-foreground/80' : 'font-semibold text-foreground',
                  ]"
                >
                  {{ mail.subject || '(no subject)' }}
                </span>
                <span
                  :class="[
                    'line-clamp-2 min-w-0 break-words text-xs font-normal',
                    mail.isRead ? 'text-muted-foreground/80' : 'text-muted-foreground',
                  ]"
                >
                  {{ mail.preview }}
                </span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>

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
  </Sidebar>
</template>
