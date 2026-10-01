<script setup lang="ts">
import { AvatarImage } from "reka-ui"

const props = defineProps<{
  src: string
  asChild?: boolean
}>()
</script>

<template>
  <AvatarImage
    data-slot="avatar-image"
    v-bind="props"
    class="aspect-square size-full"
  >
    <slot />
  </AvatarImage>
</template>
