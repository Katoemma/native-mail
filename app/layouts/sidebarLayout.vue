<script setup lang="ts">
import { LogOut, BadgeCheck, Bell, SquarePen } from '@lucide/vue'
import AppSidebar from '@/components/AppSidebar.vue'
import MailCompose from '@/components/mail/MailCompose.vue'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

const mailboxesStore = useMailboxesStore()
const sessionStore = useSessionStore()
const composer = useComposerStore()
const route = useRoute()

const { ensureEnabled } = useWebPush()
const { isList } = useMailLayout()

/**
 * Expanded sidebar width:
 * - list → labeled folder nav (Gmail-style; collapses to icon rail)
 * - split → icon rail + message list panel
 */
const sidebarWidth = computed(() => (isList.value ? '16rem' : '350px'))

const { setupFocusSync } = useSync()
onMounted(async () => {
  await mailboxesStore.fetch()
  setupFocusSync()
  // Notifications default ON after login (skips if user opted out)
  void ensureEnabled()
})

// Debounced search lives here so mobile header + desktop sidebar share one watcher
const { query: searchQuery, searchNow } = useDebouncedMailSearch(350)

const mailboxLabel = computed(() => {
  if (route.path === '/profile') return 'Profile'
  if (route.path === '/mail/search') return 'Search'
  const slug = (route.params.mailbox as string | undefined) ?? ''
  if (!slug) return 'Inbox'
  const mb = mailboxesStore.list.find(m => m.role === slug || m.id === slug)
  return mb?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1)
})

const user = computed(() => ({
  name:  sessionStore.displayName || sessionStore.username || 'User',
  email: sessionStore.email || sessionStore.username || '',
  avatar: '',
}))

const initials = computed(() => {
  const label = (user.value.name || user.value.email || 'U').trim()
  const parts = label.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return label.slice(0, 2).toUpperCase() || 'U'
})

const showComposeFab = computed(() =>
  route.path === '/mail/inbox'
  && !route.query.id
  && !composer.open,
)

function openCompose() {
  composer.openCompose()
}
</script>

<template>
  <SidebarProvider
    :style="{
      '--sidebar-width': sidebarWidth,
    }"
  >
    <AppSidebar />

    <SidebarInset class="flex flex-col overflow-hidden h-svh">
      <header class="bg-background sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b px-4 py-3 md:p-4">
        <SidebarTrigger class="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          class="mr-1 hidden data-[orientation=vertical]:h-4 md:mr-2 md:block"
        />

        <!-- Desktop breadcrumb — split mode (list lives in the sidebar panel) -->
        <Breadcrumb
          v-if="!isList"
          class="hidden min-w-0 flex-1 md:block"
        >
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/mail/inbox">
                All Inboxes
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem class="min-w-0">
              <BreadcrumbPage class="truncate">{{ mailboxLabel }}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <!-- Search: always on mobile; also on desktop in list mode (no sidebar list panel) -->
        <form
          class="min-w-0 flex-1"
          :class="isList ? '' : 'md:hidden'"
          @submit.prevent="searchNow"
        >
          <Input
            v-model="searchQuery"
            type="search"
            placeholder="Search mail..."
            class="h-9 border border-border bg-background shadow-none"
            enterkeyhint="search"
            autocomplete="off"
          />
        </form>

        <!-- Account — top-right like Gmail -->
        <div class="ml-auto shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full p-0.5 ring-2 ring-offset-2 ring-offset-background ring-primary/40 hover:ring-primary/70 transition-[box-shadow]"
                aria-label="Account menu"
              >
                <Avatar class="size-8 rounded-full sm:size-9">
                  <AvatarImage :src="user.avatar" :alt="user.name" />
                  <AvatarFallback class="rounded-full text-xs font-semibold">
                    {{ initials }}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              class="w-56 rounded-lg"
              align="end"
              :side-offset="8"
            >
              <DropdownMenuLabel class="p-0 font-normal">
                <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar class="h-8 w-8 rounded-lg">
                    <AvatarImage :src="user.avatar" :alt="user.name" />
                    <AvatarFallback class="rounded-lg">{{ initials }}</AvatarFallback>
                  </Avatar>
                  <div class="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span class="truncate font-medium">{{ user.name }}</span>
                    <span class="truncate text-xs text-muted-foreground">{{ user.email }}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem class="cursor-pointer" @click="navigateTo('/profile')">
                  <BadgeCheck class="size-4" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem class="cursor-pointer" @click="navigateTo('/profile#notifications')">
                  <Bell class="size-4" />
                  Notifications
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                class="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                @click="sessionStore.logout()"
              >
                <LogOut class="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div class="relative flex flex-1 w-full overflow-hidden">
        <slot />

        <button
          v-if="showComposeFab"
          type="button"
          class="absolute bottom-5 right-4 z-30 flex h-12 items-center gap-2 rounded-2xl bg-primary px-4 text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-95 md:hidden"
          @click="openCompose"
        >
          <SquarePen class="size-5 shrink-0" :stroke-width="1.75" />
          <span class="text-sm font-semibold tracking-tight">Compose</span>
        </button>
      </div>
    </SidebarInset>

    <MailCompose />
  </SidebarProvider>
</template>
