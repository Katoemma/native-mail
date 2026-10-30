<script setup lang="ts">
import {
  Inbox, FilePenLine, SendHorizontal, ShieldAlert, Trash2,
  SquarePen, Star,
} from '@lucide/vue'
import logoUrl from '~/assets/images/logo.png'
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

const mailboxesStore = useMailboxesStore()
const mailStore      = useMailStore()
const composer       = useComposerStore()
const router         = useRouter()
const route          = useRoute()

const { setOpenMobile, isMobile, open: sidebarOpen } = useSidebar()

/** When expanded (or on mobile drawer), show folder labels. */
const showNavLabels = computed(() => isMobile.value || sidebarOpen.value)

function closeMobileSidebar() {
  if (isMobile.value) setOpenMobile(false)
}

watch(() => route.fullPath, () => {
  closeMobileSidebar()
})

const STARRED_KEY = 'starred'

const navItems = [
  { title: 'Inbox',   role: 'inbox' as string, icon: Inbox,          url: '/mail/inbox',   virtual: false },
  { title: 'Starred', role: STARRED_KEY,       icon: Star,           url: '/mail/starred', virtual: true  },
  { title: 'Drafts',  role: 'drafts',          icon: FilePenLine,    url: '/mail/drafts',  virtual: false },
  { title: 'Sent',    role: 'sent',            icon: SendHorizontal, url: '/mail/sent',    virtual: false },
  { title: 'Spam',    role: 'junk',            icon: ShieldAlert,    url: '/mail/junk',    virtual: false },
  { title: 'Trash',   role: 'trash',           icon: Trash2,         url: '/mail/trash',   virtual: false },
]

const activeRole = computed(() => route.params.mailbox as string ?? 'inbox')

function navTo(role: string, url: string) {
  closeMobileSidebar()
  void router.push(url)

  if (role === STARRED_KEY) {
    if (!mailStore.idsByMailbox[STARRED_KEY]?.length) {
      void mailStore.fetchList(STARRED_KEY, true)
    }
    return
  }
  const mb = mailboxesStore.list.find(m => m.role === role)
  if (mb && !mailStore.idsByMailbox[mb.id]?.length) {
    void mailStore.fetchList(mb.id, true)
  }
}

function openCompose() {
  closeMobileSidebar()
  composer.openCompose()
}
</script>

<template>
  <Sidebar
    v-bind="props"
    class="border-r"
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
                      @click="navTo(item.role, item.url)"
                    >
                      <component
                        :is="item.icon"
                        class="size-[18px] shrink-0"
                        :stroke-width="1.75"
                        :class="item.role === STARRED_KEY && activeRole === STARRED_KEY
                          ? 'fill-amber-400 text-amber-400'
                          : ''"
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
                        v-if="!item.virtual && mailboxesStore.byRole(item.role as MailboxRole)?.unreadEmails"
                        :class="[
                          'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold tabular-nums text-primary-foreground',
                          showNavLabels
                            ? ''
                            : 'md:absolute md:top-1 md:right-1 md:ml-0 md:size-4 md:min-w-0 md:px-0',
                        ]"
                      >
                        {{ mailboxesStore.byRole(item.role as MailboxRole)!.unreadEmails! > 9
                          ? '9+'
                          : mailboxesStore.byRole(item.role as MailboxRole)?.unreadEmails }}
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
                      v-if="!item.virtual && mailboxesStore.byRole(item.role as MailboxRole)?.unreadEmails"
                      class="ml-1.5 text-muted-foreground"
                    >
                      · {{ mailboxesStore.byRole(item.role as MailboxRole)?.unreadEmails }} unread
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
</template>
