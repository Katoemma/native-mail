<script setup lang="ts">
import { LogOut, BadgeCheck, Bell, Search, SquarePen } from '@lucide/vue'
import AppSidebar from '@/components/AppSidebar.vue'
import MailCompose from '@/components/mail/MailCompose.vue'
import MailOnboardingOverlay from '@/components/mail/MailOnboardingOverlay.vue'
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
const mailStore = useMailStore()
const sessionStore = useSessionStore()
const composer = useComposerStore()
const route = useRoute()

const { ensureEnabled } = useWebPush()
const { isList } = useMailLayout()
const { open: onboardingOpen, runBoot } = useInboxOnboarding()

/**
 * Expanded sidebar width:
 * - list → labeled folder nav (Gmail-style; collapses to icon rail)
 * - split → icon rail + message list panel
 */
const sidebarWidth = computed(() => (isList.value ? '16rem' : '350px'))

const { setupFocusSync } = useSync()
onMounted(async () => {
  await runBoot({ fetchMailboxes: () => mailboxesStore.fetch() })
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

/** Open message id from ?id= */
const readingId = computed(() => {
  const id = route.query.id
  return typeof id === 'string' && id ? id : null
})

const readingSubject = computed(() => {
  if (!readingId.value) return null
  const list = mailStore.emails[readingId.value]
  const full = mailStore.fullEmails[readingId.value]
  const subject = (full?.subject ?? list?.subject ?? '').trim()
  return subject || '(no subject)'
})

useHead({
  title: computed(() => {
    if (readingId.value && readingSubject.value) {
      return `${readingSubject.value} · Native Mail`
    }
    if (route.path === '/profile') return 'Profile · Native Mail'
    if (route.path === '/mail/search') return 'Search · Native Mail'
    return `${mailboxLabel.value} · Native Mail`
  }),
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
    <MailOnboardingOverlay :open="onboardingOpen" />
    <AppSidebar />

    <SidebarInset class="flex flex-col overflow-hidden h-svh">
      <header class="bg-background sticky top-0 z-20 grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
        <div class="flex min-w-0 items-center gap-2">
          <SidebarTrigger class="-ml-0.5 shrink-0" />
          <Separator
            orientation="vertical"
            class="hidden data-[orientation=vertical]:h-4 md:block"
          />
          <!-- Desktop breadcrumb — split mode (list lives in the sidebar panel) -->
          <Breadcrumb
            v-if="!isList && !readingId"
            class="hidden min-w-0 md:block"
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
        </div>

        <!-- Reading: show email subject in the header (and browser tab via useHead) -->
        <h1
          v-if="readingId"
          class="min-w-0 max-w-2xl justify-self-center truncate text-center text-sm font-medium tracking-tight text-foreground sm:text-base"
        >
          {{ readingSubject }}
        </h1>

        <!-- Search: capped width, centered — list mode + mobile; hidden while reading / desktop split -->
        <form
          v-else
          class="mx-auto w-full max-w-md justify-self-center"
          :class="isList ? 'flex' : 'flex md:invisible md:pointer-events-none'"
          @submit.prevent="searchNow"
        >
          <div class="relative w-full">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              :stroke-width="1.75"
              aria-hidden="true"
            />
            <Input
              v-model="searchQuery"
              type="search"
              placeholder="Search mail..."
              class="h-10 w-full rounded-full border-0 bg-muted/70 pl-9 pr-4 shadow-none transition-[background-color,box-shadow] placeholder:text-muted-foreground/80 hover:bg-muted focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/40"
              enterkeyhint="search"
              autocomplete="off"
            />
          </div>
        </form>

        <!-- Account — top-right -->
        <div class="justify-self-end">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full p-0.5 ring-2 ring-offset-2 ring-offset-background ring-primary/40 transition-[box-shadow] hover:ring-primary/70"
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
