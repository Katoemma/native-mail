<script setup lang="ts">
definePageMeta({ layout: false })

const sessionStore = useSessionStore()
const route        = useRoute()

// Show error if Stalwart returned one via the callback redirect
const oauthError = computed(() => route.query.error as string | undefined)

// If already logged in, go straight to inbox
onMounted(async () => {
  await sessionStore.fetchSession()
  if (sessionStore.loggedIn) await navigateTo('/mail/inbox')
})
</script>

<template>
  <div class="min-h-svh flex items-center justify-center bg-background p-4">
    <div class="w-full max-w-sm space-y-8">

      <!-- Brand -->
      <div class="text-center space-y-3">
        <div class="inline-flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-lg">
          N
        </div>
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Native Mail</h1>
          <p class="text-sm text-muted-foreground mt-1">
            Powered by Stalwart
          </p>
        </div>
      </div>

      <!-- OAuth error banner -->
      <div
        v-if="oauthError"
        class="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3"
      >
        <p class="font-medium">Authentication failed</p>
        <p class="mt-0.5 opacity-80">{{ oauthError }}</p>
      </div>

      <!-- Sign-in card -->
      <div class="rounded-xl border bg-card shadow-sm p-6 space-y-4">
        <div class="space-y-1">
          <h2 class="text-base font-medium">Sign in to your mailbox</h2>
          <p class="text-sm text-muted-foreground">
            You will be redirected to the mail server to authenticate securely.
            Your password is never shared with this application.
          </p>
        </div>

        <button
          class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-2.5 text-sm font-medium"
          :disabled="sessionStore.loading"
          @click="sessionStore.startOAuth()"
        >
          <svg
            v-if="sessionStore.loading"
            class="size-4 animate-spin"
            viewBox="0 0 24 24" fill="none"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <span>{{ sessionStore.loading ? 'Checking session…' : 'Sign in with Stalwart' }}</span>
        </button>
      </div>

      <p class="text-center text-xs text-muted-foreground">
        Uses OAuth 2.0 + PKCE — your credentials stay with the mail server.
      </p>
    </div>
  </div>
</template>
