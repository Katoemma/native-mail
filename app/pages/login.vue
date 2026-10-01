<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

definePageMeta({ layout: false })

const sessionStore = useSessionStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const loading = computed(() => sessionStore.loading)
const error = computed(() => sessionStore.error)

async function handleLogin() {
  const ok = await sessionStore.login(username.value, password.value)
  if (ok) {
    await router.push('/mail/inbox')
  }
}
</script>

<template>
  <div class="min-h-svh flex items-center justify-center bg-background p-4">
    <div class="w-full max-w-sm space-y-6">
      <!-- Logo / Brand -->
      <div class="text-center space-y-2">
        <div class="inline-flex items-center justify-center size-12 rounded-xl bg-primary text-primary-foreground text-xl font-bold">
          N
        </div>
        <h1 class="text-2xl font-semibold tracking-tight">Native Mail</h1>
        <p class="text-sm text-muted-foreground">Sign in to your mailbox</p>
      </div>

      <!-- Form -->
      <form class="space-y-4" @submit.prevent="handleLogin">
        <div class="space-y-2">
          <Label for="username">Email address</Label>
          <Input
            id="username"
            v-model="username"
            type="email"
            placeholder="you@example.com"
            autocomplete="username"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <div v-if="error" class="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">
          {{ error }}
        </div>

        <Button type="submit" class="w-full" :disabled="loading">
          <span v-if="loading">Signing in…</span>
          <span v-else>Sign in</span>
        </Button>
      </form>
    </div>
  </div>
</template>
