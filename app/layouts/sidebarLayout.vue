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

// Fetch mailboxes once when the layout mounts
onMounted(async () => {
  await mailboxesStore.fetch()
})

// Derive breadcrumb label from the current mailbox route param
const mailboxLabel = computed(() => {
  const slug = (route.params.mailbox as string | undefined) ?? ''
  if (!slug) return 'Inbox'
  const mb = mailboxesStore.list.find(m => m.role === slug || m.id === slug)
  return mb?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1)
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
      </header>

      <!-- Page content injected here — full height, no padding, for the email viewer -->
      <div class="flex flex-1 overflow-hidden">
        <slot />
      </div>
    </SidebarInset>

    <!-- Floating compose window — available on every mail page -->
    <MailCompose />
  </SidebarProvider>
</template>
