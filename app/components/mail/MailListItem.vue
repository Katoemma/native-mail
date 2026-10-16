<script setup lang="ts">
import { Paperclip, Star } from '@lucide/vue'
import type { MailMessage } from '../../../shared/types'

const props = defineProps<{ email: MailMessage; active?: boolean }>()
const emit = defineEmits<{ click: [id: string]; star: [id: string, val: boolean] }>()

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86_400_000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 7 * 86_400_000) {
    return d.toLocaleDateString([], { weekday: 'short' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const senderName = computed(() => {
  const f = props.email.from[0]
  return f?.name || f?.email || '(unknown)'
})
</script>

<template>
  <button
    :class="[
      'relative w-full min-w-0 overflow-hidden text-left flex flex-col gap-1 px-4 py-3 border-b transition-colors',
      active
        ? 'bg-accent text-accent-foreground'
        : 'hover:bg-muted/50',
      !email.isRead && !active && 'bg-primary/[0.04]',
    ]"
    @click="emit('click', email.id)"
  >
    <span
      v-if="!email.isRead"
      class="absolute inset-y-0 left-0 w-0.5 bg-primary"
    />

    <div class="flex min-w-0 items-center gap-2">
      <span
        :class="[
          'size-2 rounded-full shrink-0',
          email.isRead ? 'bg-transparent' : 'bg-primary',
        ]"
      />

      <span
        :class="[
          'min-w-0 flex-1 text-sm truncate',
          email.isRead ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground',
        ]"
      >
        {{ senderName }}
      </span>

      <!-- Star -->
      <button
        class="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
        :aria-label="email.isStarred ? 'Unstar' : 'Star'"
        @click.stop="emit('star', email.id, !email.isStarred)"
      >
        <Star
          :class="['size-3.5', email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground']"
        />
      </button>

      <span
        :class="[
          'text-xs shrink-0 tabular-nums',
          email.isRead ? 'text-muted-foreground' : 'text-foreground/70 font-medium',
        ]"
      >
        {{ formatDate(email.receivedAt) }}
      </span>
    </div>

    <div
      :class="[
        'min-w-0 text-sm truncate pl-4',
        email.isRead ? 'font-normal text-foreground/80' : 'font-semibold text-foreground',
      ]"
    >
      {{ email.subject || '(no subject)' }}
    </div>

    <div class="flex min-w-0 items-center gap-1 pl-4">
      <span
        :class="[
          'min-w-0 flex-1 text-xs truncate',
          email.isRead ? 'text-muted-foreground/80' : 'text-muted-foreground',
        ]"
      >{{ email.preview }}</span>
      <Paperclip v-if="email.hasAttachment" class="size-3 text-muted-foreground shrink-0" />
    </div>
  </button>
</template>
