<script setup lang="ts">
import { Paperclip, Star, Check } from '@lucide/vue'
import type { MailMessage } from '../../../shared/types'
import { avatarStyle, senderInitials } from '~/utils/avatar'

const props = defineProps<{
  email: MailMessage
  active?: boolean
  selectable?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  click: [id: string]
  star: [id: string, val: boolean]
  toggleSelect: [id: string]
}>()

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

const from = computed(() => props.email.from[0])
const senderName = computed(() => from.value?.name || from.value?.email || '(unknown)')
const initials = computed(() => senderInitials(from.value?.name, from.value?.email))
const avatar = computed(() => avatarStyle(from.value?.email || senderName.value))
</script>

<template>
  <div
    :class="[
      'relative w-full min-w-0 overflow-hidden text-left flex gap-3 px-4 py-3 border-b transition-colors cursor-pointer',
      active
        ? 'bg-accent text-accent-foreground'
        : 'hover:bg-muted/50',
      !email.isRead && !active && 'bg-primary/[0.04]',
      selected && 'bg-primary/8',
    ]"
    role="button"
    tabindex="0"
    @click="emit('click', email.id)"
    @keydown.enter.prevent="emit('click', email.id)"
  >
    <span
      v-if="!email.isRead"
      class="absolute inset-y-0 left-0 w-0.5 bg-primary"
    />

    <!-- Selection checkbox -->
    <button
      v-if="selectable"
      type="button"
      class="mt-1.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors"
      :class="selected
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-muted-foreground/40 bg-background hover:border-primary'"
      :aria-label="selected ? 'Deselect' : 'Select'"
      :aria-pressed="selected"
      @click.stop="emit('toggleSelect', email.id)"
    >
      <Check v-if="selected" class="size-3.5" :stroke-width="2.5" />
    </button>

    <!-- Avatar -->
    <div
      class="size-10 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold select-none ring-1 ring-black/5"
      :style="avatar"
      aria-hidden="true"
    >
      {{ initials }}
    </div>

    <div class="min-w-0 flex-1 flex flex-col gap-0.5">
      <div class="flex min-w-0 items-center gap-2">
        <span
          v-if="!email.isRead"
          class="size-1.5 rounded-full bg-primary shrink-0"
        />
        <span
          :class="[
            'min-w-0 flex-1 text-sm truncate',
            email.isRead ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground',
          ]"
        >
          {{ senderName }}
        </span>

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
          'min-w-0 text-sm truncate',
          email.isRead ? 'font-normal text-foreground/80' : 'font-semibold text-foreground',
        ]"
      >
        {{ email.subject || '(no subject)' }}
      </div>

      <div class="flex min-w-0 items-center gap-1">
        <span
          :class="[
            'min-w-0 flex-1 text-xs truncate',
            email.isRead ? 'text-muted-foreground/80' : 'text-muted-foreground',
          ]"
        >{{ email.preview }}</span>
        <Paperclip v-if="email.hasAttachment" class="size-3 text-muted-foreground shrink-0" />
      </div>
    </div>
  </div>
</template>
