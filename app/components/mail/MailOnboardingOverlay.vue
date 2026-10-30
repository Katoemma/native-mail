<script setup lang="ts">
import BootSplash from '@/components/BootSplash.vue'

defineProps<{
  open: boolean
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-500 ease-out"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <BootSplash
        v-if="open"
        label="Loading your inbox"
        show-help
      />
    </Transition>
  </Teleport>
</template>
