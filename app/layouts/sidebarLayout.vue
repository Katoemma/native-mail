<script setup lang="ts">
import { Search, X, LogOut, BadgeCheck, Bell } from '@lucide/vue'
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
const route = useRoute()
const router = useRouter()
const { query: searchQuery, search } = useSearch()

// Start WebSocket sync at layout level — persists across page navigations
const { setupFocusSync } = useSync()
onMounted(async () => {
  await mailboxesStore.fetch()
  setupFocusSync()
})

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

const searchOpen = ref(false)
const mobileSearch = ref('')

watch(searchOpen, (open) => {
  if (open) {
    mobileSearch.value = typeof route.query.q === 'string' ? route.query.q : searchQuery.value
  }
})

function closeMobileSearch() {
  searchOpen.value = false
}

function submitMobileSearch() {
  const q = mobileSearch.value.trim()
  if (!q) return
  searchOpen.value = false
  void router.push({ path: '/mail/search', query: { q } })
  void search(q)
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
      <!-- Sticky top header with sidebar trigger + breadcrumb -->
      <header class="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b px-4 py-3 md:p-4">
        <template v-if="searchOpen">
          <button
            type="button"
            class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
            aria-label="Close search"
            @click="closeMobileSearch"
          >
            <X class="size-4" :stroke-width="1.75" />
          </button>
          <form class="flex flex-1 min-w-0 md:hidden" @submit.prevent="submitMobileSearch">
            <Input
              v-model="mobileSearch"
              type="search"
              placeholder="Search mail..."
              class="h-8 bg-background shadow-none"
              enterkeyhint="search"
              autofocus
            />
          </form>
        </template>

        <template v-else>
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

          <!-- Mobile: search + profile in the header trailing space -->
          <div class="ml-auto flex items-center gap-0.5 md:hidden">
            <button
              type="button"
              class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Search"
              @click="searchOpen = true"
            >
              <Search class="size-4" :stroke-width="1.75" />
            </button>

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
        </template>
      </header>

      <!-- Page content injected here — full height, no padding, for the email viewer -->
      <div class="flex flex-1 w-full overflow-hidden">
        <slot />
      </div>
    </SidebarInset>

    <!-- Floating compose window — available on every mail page -->
    <MailCompose />
  </SidebarProvider>
</template>
