<script setup lang="ts">
import { Archive, Check, Mail, MailOpen, Paperclip, Star, Trash2 } from '@lucide/vue'
import type { MailMessage } from '../../../shared/types'

const props = defineProps<{
  email: MailMessage
  active?: boolean
  selectable?: boolean
  selected?: boolean
  /** Show hover quick actions (list / Gmail style) */
  showActions?: boolean
}>()

const emit = defineEmits<{
  click: [id: string]
  star: [id: string, val: boolean]
  toggleSelect: [id: string]
  trash: [id: string]
  archive: [id: string]
  markRead: [id: string, read: boolean]
}>()

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86_400_000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  if (diff < 7 * 86_400_000) {
    return d.toLocaleDateString([], { weekday: 'short' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const from = computed(() => props.email.from[0])
const senderName = computed(() => from.value?.name || from.value?.email || '(unknown)')
</script>

<template>
  <div
    :class="[
      'group/row relative flex w-full min-w-0 cursor-pointer items-center gap-1 border-b px-2 py-2.5 text-left text-sm transition-colors sm:gap-1.5 sm:px-3 sm:py-2',
      active
        ? 'bg-accent text-accent-foreground'
        : 'bg-background hover:bg-muted/40',
      selected && 'bg-primary/8 hover:bg-primary/10',
    ]"
    role="button"
    tabindex="0"
    @click="emit('click', email.id)"
    @keydown.enter.prevent="emit('click', email.id)"
  >
    <!-- Checkbox -->
    <button
      v-if="selectable"
      type="button"
      class="flex size-5 shrink-0 items-center justify-center rounded border transition-colors"
      :class="selected
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-muted-foreground/35 bg-transparent hover:border-foreground/50'"
      :aria-label="selected ? 'Deselect' : 'Select'"
      :aria-pressed="selected"
      @click.stop="emit('toggleSelect', email.id)"
    >
      <Check v-if="selected" class="size-3" :stroke-width="2.5" />
    </button>
    <span v-else class="size-5 shrink-0" aria-hidden="true" />

    <!-- Star -->
    <button
      type="button"
      class="flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted"
      :aria-label="email.isStarred ? 'Unstar' : 'Star'"
      @click.stop="emit('star', email.id, !email.isStarred)"
    >
      <Star
        :class="[
          'size-4',
          email.isStarred
            ? 'fill-amber-400 text-amber-400'
            : 'text-muted-foreground/50 group-hover/row:text-muted-foreground',
        ]"
      />
    </button>

    <!-- Sender -->
    <span
      :class="[
        'hidden w-[7.5rem] shrink-0 truncate sm:block sm:w-40 md:w-44',
        email.isRead ? 'font-normal text-foreground/80' : 'font-bold text-foreground',
      ]"
    >
      {{ senderName }}
    </span>

    <!-- Subject — preview (Gmail inline) -->
    <div class="flex min-w-0 flex-1 items-baseline gap-1.5 overflow-hidden leading-snug">
      <!-- Mobile: sender above isn't shown; prefix name -->
      <span
        :class="[
          'truncate sm:hidden',
          email.isRead ? 'font-normal text-foreground/80' : 'font-bold text-foreground',
        ]"
      >
        {{ senderName }}
      </span>
      <span
        :class="[
          'max-w-[40%] shrink-0 truncate sm:max-w-none sm:shrink',
          email.isRead ? 'font-normal text-foreground/90' : 'font-bold text-foreground',
        ]"
      >
        {{ email.subject || '(no subject)' }}
      </span>
      <span class="hidden shrink-0 text-muted-foreground/70 sm:inline">—</span>
      <span class="min-w-0 flex-1 truncate text-muted-foreground">
        {{ email.preview }}
      </span>
    </div>

    <Paperclip
      v-if="email.hasAttachment"
      class="size-3.5 shrink-0 text-muted-foreground opacity-70"
    />

    <!-- Date (hidden on row hover when actions show) -->
    <span
      :class="[
        'shrink-0 pl-2 text-xs tabular-nums',
        showActions ? 'group-hover/row:hidden' : '',
        email.isRead ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground/75',
      ]"
    >
      {{ formatDate(email.receivedAt) }}
    </span>

    <!-- Hover actions -->
    <div
      v-if="showActions"
      class="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-lg bg-background/95 px-0.5 shadow-sm ring-1 ring-border group-hover/row:flex"
      @click.stop
    >
      <button
        type="button"
        class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Archive"
        @click="emit('archive', email.id)"
      >
        <Archive class="size-4" />
      </button>
      <button
        type="button"
        class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Trash"
        @click="emit('trash', email.id)"
      >
        <Trash2 class="size-4" />
      </button>
      <button
        type="button"
        class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        :aria-label="email.isRead ? 'Mark unread' : 'Mark read'"
        @click="emit('markRead', email.id, !email.isRead)"
      >
        <MailOpen v-if="email.isRead" class="size-4" />
        <Mail v-else class="size-4" />
      </button>
    </div>
  </div>
</template>
