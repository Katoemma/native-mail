<script setup lang="ts">
definePageMeta({
  layout: 'sidebar-layout',
  middleware: ['auth'],
})

const router = useRouter()
onMounted(() => router.replace('/mail/inbox'))
</script>

<template>
  <div class="flex items-center justify-center h-32 text-muted-foreground text-sm">
    Redirecting to inbox…
  </div>
</template>
