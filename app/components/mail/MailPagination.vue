<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import type { MailPageInfo } from '@/stores/mail'

defineProps<{
  info: MailPageInfo
  loading?: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
}>()

function formatCount(n: number) {
  return n.toLocaleString()
}
</script>

<template>
  <div
    v-if="info.total > 0"
    class="ml-auto flex shrink-0 items-center gap-0.5 text-muted-foreground"
  >
    <span class="px-1 text-xs tabular-nums whitespace-nowrap sm:text-sm">
      {{ formatCount(info.start) }}–{{ formatCount(info.end) }} of {{ formatCount(info.total) }}
    </span>
    <button
      type="button"
      class="inline-flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
      :disabled="!info.canPrev || loading"
      aria-label="Newer messages"
      @click="emit('prev')"
    >
      <ChevronLeft class="size-4" :stroke-width="1.75" />
    </button>
    <button
      type="button"
      class="inline-flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
      :disabled="!info.canNext || loading"
      aria-label="Older messages"
      @click="emit('next')"
    >
      <ChevronRight class="size-4" :stroke-width="1.75" />
    </button>
  </div>
</template>
