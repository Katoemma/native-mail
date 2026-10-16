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

const { setupFocusSync } = useSync()
onMounted(async () => {
  await mailboxesStore.fetch()
  setupFocusSync()
})

// Debounced search lives here so mobile header + desktop sidebar share one watcher
const { query: searchQuery, searchNow } = useDebouncedMailSearch(350)

const mailboxLabel = computed(() => {
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
      '--sidebar-width': '350px',
    }"
  >
    <AppSidebar />

    <SidebarInset class="flex flex-col overflow-hidden h-svh">
      <header class="bg-background sticky top-0 z-20 flex shrink-0 flex-col gap-2 border-b px-4 py-3 md:gap-0 md:p-4">
        <div class="flex items-center gap-2">
          <SidebarTrigger class="-ml-1" />
          <Separator
            orientation="vertical"
            class="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb class="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem class="hidden md:block">
                <BreadcrumbLink href="/mail/inbox">
                  All Inboxes
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator class="hidden md:block" />
              <BreadcrumbItem class="min-w-0">
                <BreadcrumbPage class="truncate">{{ mailboxLabel }}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div class="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <button
                  type="button"
                  class="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
                  aria-label="Account menu"
                >
                  <Avatar class="size-7 rounded-lg">
                    <AvatarImage :src="user.avatar" :alt="user.name" />
                    <AvatarFallback class="rounded-lg text-[10px] font-semibold">
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
                  <DropdownMenuItem>
                    <BadgeCheck class="size-4" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem>
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
        </div>

        <form class="md:hidden" @submit.prevent="searchNow">
          <Input
            v-model="searchQuery"
            type="search"
            placeholder="Search mail..."
            class="h-9 border-0 bg-muted/40 shadow-none"
            enterkeyhint="search"
            autocomplete="off"
          />
        </form>
      </header>

      <div class="relative flex flex-1 w-full overflow-hidden">
        <slot />

        <button
          v-if="showComposeFab"
          type="button"
          class="absolute bottom-5 right-4 z-30 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-95 md:hidden"
          aria-label="Compose"
          @click="openCompose"
        >
          <SquarePen class="size-6" :stroke-width="1.75" />
        </button>
      </div>
    </SidebarInset>

    <MailCompose />
  </SidebarProvider>
</template>
