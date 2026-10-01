<script setup lang="ts">
import MailListItem from './MailListItem.vue'
import type { MailMessage } from '../../../shared/types'

const props = defineProps<{
  emails: MailMessage[]
  loading: boolean
  hasMore: boolean
  selectedId?: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  loadMore: []
}>()

const mailStore = useMailStore()

// Infinite scroll sentinel
const sentinel = ref<HTMLElement | null>(null)
const { stop } = useIntersectionObserver(sentinel, ([entry]) => {
  if (entry.isIntersecting && props.hasMore && !props.loading) {
    emit('loadMore')
  }
})
onUnmounted(() => stop())
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <!-- Skeleton loaders on first load -->
      <template v-if="loading && !emails.length">
        <div
          v-for="i in 8"
          :key="i"
          class="px-4 py-3 border-b space-y-2"
        >
          <div class="flex gap-2">
            <div class="h-3 w-24 rounded bg-muted animate-pulse" />
            <div class="ml-auto h-3 w-10 rounded bg-muted animate-pulse" />
          </div>
          <div class="h-3 w-48 rounded bg-muted animate-pulse" />
          <div class="h-3 w-64 rounded bg-muted animate-pulse" />
        </div>
      </template>

      <!-- Empty state -->
      <div
        v-else-if="!loading && !emails.length"
        class="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-16"
      >
        <span class="text-4xl">📭</span>
        <p class="text-sm">No messages here</p>
      </div>

      <!-- List -->
      <template v-else>
        <MailListItem
          v-for="email in emails"
          :key="email.id"
          :email="email"
          :active="email.id === selectedId"
          @click="emit('select', $event)"
          @star="(id, val) => mailStore.markStarred(id, val)"
        />

        <!-- Infinite scroll sentinel -->
        <div ref="sentinel" class="h-1" />

        <!-- Load more spinner -->
        <div v-if="loading && emails.length" class="flex justify-center py-4">
          <div class="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </template>
    </div>
  </div>
</template>
