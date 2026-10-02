<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import MailCompose from '@/components/mail/MailCompose.vue'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

const mailboxesStore = useMailboxesStore()
const route = useRoute()

// Start WebSocket sync at layout level — persists across page navigations
const { wsStatus, setupFocusSync } = useSync()
onMounted(async () => {
  await mailboxesStore.fetch()
  setupFocusSync()
})

const mailboxLabel = computed(() => {
  const slug = (route.params.mailbox as string | undefined) ?? ''
  if (!slug) return 'Inbox'
  const mb = mailboxesStore.list.find(m => m.role === slug || m.id === slug)
  return mb?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1)
})

// Connection indicator
const wsIndicatorClass = computed(() => {
  switch (wsStatus.value) {
    case 'connected':    return 'bg-emerald-500'
    case 'connecting':   return 'bg-amber-400 animate-pulse'
    case 'disconnected': return 'bg-muted-foreground/40'
  }
})
const wsTitle = computed(() => {
  switch (wsStatus.value) {
    case 'connected':    return 'Real-time sync active'
    case 'connecting':   return 'Connecting…'
    case 'disconnected': return 'Offline — changes may be delayed'
  }
})
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
      <header class="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4">
        <SidebarTrigger class="-ml-1" />
        <Separator
          orientation="vertical"
          class="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem class="hidden md:block">
              <BreadcrumbLink href="/mail/inbox">
                All Inboxes
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator class="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{{ mailboxLabel }}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <!-- WebSocket connection indicator -->
        <div class="ml-auto flex items-center gap-1.5" :title="wsTitle">
          <span
            :class="['size-2 rounded-full shrink-0 transition-colors duration-500', wsIndicatorClass]"
          />
          <span class="hidden sm:inline text-xs text-muted-foreground">
            {{ wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting…' : 'Offline' }}
          </span>
        </div>
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
