<script setup lang="ts">
import MailSidebar from '@/components/mail/MailSidebar.vue'
import MailCompose from '@/components/mail/MailCompose.vue'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'

const mailboxesStore = useMailboxesStore()

onMounted(async () => {
  await mailboxesStore.fetch()
})
</script>

<template>
  <SidebarProvider>
    <!-- Left sidebar — mail navigation -->
    <aside
      class="w-64 shrink-0 hidden md:flex flex-col h-svh border-r bg-sidebar overflow-hidden"
    >
      <MailSidebar />
    </aside>

    <SidebarInset class="flex flex-col flex-1 min-h-svh overflow-hidden">
      <!-- Mobile sidebar trigger -->
      <div class="flex items-center gap-2 px-4 py-2 border-b md:hidden">
        <SidebarTrigger />
        <span class="text-sm font-medium">Native Mail</span>
      </div>

      <!-- Page content -->
      <main class="flex-1 overflow-hidden">
        <slot />
      </main>
    </SidebarInset>

    <!-- Floating compose window -->
    <MailCompose />
  </SidebarProvider>
</template>
