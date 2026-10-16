<script setup lang="ts">
import { ArchiveX, File, Inbox, Send, Trash2, PenSquare, Star } from '@lucide/vue'
import { h } from 'vue'
import NavUser from '@/components/NavUser.vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Switch } from '@/components/ui/switch'
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
const sessionStore   = useSessionStore()
const composer       = useComposerStore()
const router         = useRouter()
const route          = useRoute()

const { setOpen, isMobile } = useSidebar()

// ── Nav items — roles map to routes ──────────────────────────────────────────
const navItems = [
  { title: 'Inbox',  role: 'inbox'  as MailboxRole, icon: Inbox,   url: '/mail/inbox'  },
  { title: 'Drafts', role: 'drafts' as MailboxRole, icon: File,    url: '/mail/drafts' },
  { title: 'Sent',   role: 'sent'   as MailboxRole, icon: Send,    url: '/mail/sent'   },
  { title: 'Junk',   role: 'junk'   as MailboxRole, icon: ArchiveX,url: '/mail/junk'   },
  { title: 'Trash',  role: 'trash'  as MailboxRole, icon: Trash2,  url: '/mail/trash'  },
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

// ── Navigation click ─────────────────────────────────────────────────────────
async function navTo(role: string, url: string) {
  // Load emails for this mailbox if not yet loaded
  const mb = mailboxesStore.list.find(m => m.role === role)
  if (mb && !mailStore.idsByMailbox[mb.id]?.length) {
    await mailStore.fetchList(mb.id, true)
  }

  // On mobile: close the sidebar so the SidebarInset (email list) fills the screen
  // On desktop: open the second panel
  if (isMobile.value) {
    setOpen(false)
  } else {
    setOpen(true)
  }

  router.push(url)
}

// ── Select an email from the panel ───────────────────────────────────────────
function selectMail(emailId: string) {
  // On mobile: close sidebar so the viewer fills the screen
  if (isMobile.value) setOpen(false)
  router.push({ path: `/mail/${activeRole.value}`, query: { id: emailId } })
}

// ── Search ────────────────────────────────────────────────────────────────────
const searchQuery = ref('')
function onSearch(e: Event) {
  const q = (e.target as HTMLInputElement).value.trim()
  if (q) router.push(`/mail/search?q=${encodeURIComponent(q)}`)
}

// ── User ──────────────────────────────────────────────────────────────────────
const user = computed(() => ({
  name:   sessionStore.displayName ?? sessionStore.username ?? '?',
  email:  sessionStore.email ?? '',
  avatar: '',
}))

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
</script>

<template>
  <Sidebar
    class="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
    v-bind="props"
  >
    <!-- ── First sidebar: icon strip ────────────────────────────────────── -->
    <Sidebar
      collapsible="none"
      class="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" as-child class="md:h-8 md:p-0">
              <button @click="composer.openCompose()">
                <div class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <PenSquare class="size-4" />
                </div>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-medium">Compose</span>
                </div>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent class="px-1.5 md:px-0">
            <SidebarMenu>
              <SidebarMenuItem v-for="item in navItems" :key="item.title">
                <SidebarMenuButton
                  :tooltip="h('div', { hidden: false }, item.title)"
                  :is-active="activeRole === item.role"
                  class="px-2.5 md:px-2"
                  @click="navTo(item.role!, item.url)"
                >
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                  <!-- Unread badge on icon -->
                  <span
                    v-if="mailboxesStore.byRole(item.role!)?.unreadEmails"
                    class="ml-auto flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold"
                  >
                    {{ mailboxesStore.byRole(item.role!)?.unreadEmails }}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser :user="user" />
      </SidebarFooter>
    </Sidebar>

    <!-- ── Second sidebar: mail list panel ──────────────────────────────── -->
    <Sidebar collapsible="none" class="hidden min-w-0 flex-1 md:flex">
      <SidebarHeader class="gap-3.5 border-b p-4">
        <div class="flex w-full items-center justify-between">
          <div class="text-base font-medium text-foreground">
            {{ activeMailbox?.name ?? activeRole }}
          </div>
          <Label class="flex items-center gap-2 text-sm">
            <span>Unreads</span>
            <Switch v-model:checked="showUnreadOnly" class="shadow-none" />
          </Label>
        </div>
        <Input
          v-model="searchQuery"
          class="bg-background h-8 w-full shadow-none"
          placeholder="Type to search..."
          @keydown.enter="onSearch"
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup class="px-0">
          <SidebarGroupContent>
            <!-- Loading skeletons -->
            <template v-if="panelLoading && !panelEmails.length">
              <div v-for="i in 6" :key="i" class="flex flex-col gap-2 border-b p-4">
                <div class="flex gap-2">
                  <div class="h-2.5 w-24 rounded bg-muted animate-pulse" />
                  <div class="ml-auto h-2.5 w-10 rounded bg-muted animate-pulse" />
                </div>
                <div class="h-2.5 w-40 rounded bg-muted animate-pulse" />
                <div class="h-2.5 w-56 rounded bg-muted animate-pulse" />
              </div>
            </template>

            <!-- Empty state -->
            <div
              v-else-if="!panelLoading && !panelEmails.length"
              class="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2"
            >
              <span class="text-3xl">📭</span>
              <p class="text-xs">No messages</p>
            </div>

            <!-- Mail list -->
            <button
              v-for="mail in panelEmails"
              :key="mail.id"
              :class="[
                'w-full min-w-0 overflow-hidden text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-stretch gap-2 border-b p-4 text-sm leading-tight last:border-b-0 transition-colors',
                !mail.isRead && 'bg-sidebar-accent/30 font-medium',
                route.params.id === mail.id && 'bg-sidebar-accent text-sidebar-accent-foreground',
              ]"
              @click="selectMail(mail.id)"
            >
              <div class="flex w-full min-w-0 items-center gap-2">
                <!-- Unread dot -->
                <span
                  v-if="!mail.isRead"
                  class="size-1.5 rounded-full bg-primary shrink-0"
                />
                <span class="truncate min-w-0 flex-1">
                  {{ mail.from[0]?.name || mail.from[0]?.email || '(unknown)' }}
                </span>
                <Star
                  v-if="mail.isStarred"
                  class="size-3 fill-amber-400 text-amber-400 shrink-0"
                />
                <span class="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {{ formatDate(mail.receivedAt) }}
                </span>
              </div>
              <span class="font-medium truncate min-w-0">{{ mail.subject }}</span>
              <span class="line-clamp-2 min-w-0 break-words text-xs text-muted-foreground font-normal">
                {{ mail.preview }}
              </span>
            </button>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  </Sidebar>
</template>
