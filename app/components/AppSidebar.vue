<script setup lang="ts">
import {
  Inbox, FilePenLine, SendHorizontal, ShieldAlert, Trash2,
  SquarePen, Star,
} from '@lucide/vue'
import { avatarStyle, senderInitials } from '~/utils/avatar'
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
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
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

const { setOpen, setOpenMobile, isMobile } = useSidebar()

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

// ── Navigation click ─────────────────────────────────────────────────────────
function navTo(role: string, url: string) {
  // Close the mobile drawer immediately — don't wait for fetch/navigation
  closeMobileSidebar()
  if (!isMobile.value) setOpen(true)

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
  void router.push({ path: `/mail/${activeRole.value}`, query: { id: emailId } })
}

// ── Search ────────────────────────────────────────────────────────────────────
const searchQuery = ref('')
function onSearch(e: Event) {
  const q = (e.target as HTMLInputElement).value.trim()
  if (!q) return
  closeMobileSidebar()
  void router.push(`/mail/search?q=${encodeURIComponent(q)}`)
}

function openCompose() {
  closeMobileSidebar()
  composer.openCompose()
}

// ── User ──────────────────────────────────────────────────────────────────────
// Use || (not ??) so empty strings from a partial session still fall through.
const user = computed(() => ({
  name:   sessionStore.displayName || sessionStore.username || 'User',
  email:  sessionStore.email || sessionStore.username || '',
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
    <!-- ── First sidebar: full nav on mobile, icon rail on desktop ──────── -->
    <Sidebar
      collapsible="none"
      class="w-full border-r md:w-[calc(var(--sidebar-width-icon)+1px)]!"
    >
      <SidebarHeader class="px-3 md:px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <TooltipProvider :delay-duration="200">
              <Tooltip>
                <TooltipTrigger as-child>
                  <SidebarMenuButton size="lg" as-child class="md:h-8 md:p-0">
                    <button type="button" @click="openCompose()">
                      <div class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shrink-0">
                        <SquarePen class="size-4" :stroke-width="1.75" />
                      </div>
                      <div class="grid min-w-0 flex-1 text-left text-sm leading-tight md:hidden">
                        <span class="truncate font-semibold tracking-tight">Compose</span>
                        <span class="truncate text-xs text-muted-foreground">New message</span>
                      </div>
                    </button>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  align="center"
                  :hidden="isMobile"
                >
                  Compose
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup class="px-2 md:px-0">
          <SidebarGroupContent>
            <TooltipProvider :delay-duration="200">
              <SidebarMenu class="gap-1">
                <SidebarMenuItem v-for="item in navItems" :key="item.title">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <SidebarMenuButton
                        :is-active="activeRole === item.role"
                        class="relative h-11 gap-3 px-3 md:h-8 md:justify-center md:gap-2 md:px-2"
                        @click="navTo(item.role!, item.url)"
                      >
                        <component
                          :is="item.icon"
                          class="size-[18px] shrink-0"
                          :stroke-width="1.75"
                        />
                        <!-- Labels: visible in mobile drawer, icon-only on desktop -->
                        <span class="truncate text-[0.9375rem] font-medium tracking-tight md:sr-only">
                          {{ item.title }}
                        </span>
                        <span
                          v-if="mailboxesStore.byRole(item.role!)?.unreadEmails"
                          class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold tabular-nums text-primary-foreground md:absolute md:top-1 md:right-1 md:ml-0 md:size-4 md:min-w-0 md:px-0"
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
                      :hidden="isMobile"
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

      <SidebarFooter class="px-2 md:px-0">
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
                'group/mail relative w-full min-w-0 overflow-hidden text-left flex gap-3 border-b px-4 py-3.5 text-sm leading-tight last:border-b-0 transition-colors',
                route.query.id === mail.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/50',
                !mail.isRead && route.query.id !== mail.id && 'bg-primary/[0.04]',
              ]"
              @click="selectMail(mail.id)"
            >
              <!-- Unread accent bar -->
              <span
                v-if="!mail.isRead"
                class="absolute inset-y-0 left-0 w-0.5 bg-primary"
              />

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
            </button>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  </Sidebar>
</template>
