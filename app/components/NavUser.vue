<script setup lang="ts">
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
} from '@lucide/vue'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

const props = defineProps<{
  user: {
    name: string
    email: string
    avatar: string
  }
}>()

const { isMobile } = useSidebar()
const sessionStore = useSessionStore()
const {
  status: pushStatus,
  busy: pushBusy,
  error: pushError,
  iosNeedsInstall,
  toggle: togglePush,
} = useWebPush()

const pushLabel = computed(() => {
  if (pushBusy.value) return 'Updating…'
  switch (pushStatus.value) {
    case 'enabled': return 'Notifications · On'
    case 'denied': return 'Notifications · Blocked'
    case 'unsupported':
      return iosNeedsInstall.value ? 'Notifications · Install app' : 'Notifications · N/A'
    default: return 'Notifications · Off'
  }
})

async function onNotificationsClick(e: Event) {
  e.preventDefault()
  if (pushBusy.value || pushStatus.value === 'denied' || pushStatus.value === 'unsupported') return
  await togglePush()
}

// Initials for avatar fallback — never empty (blank AvatarFallback looks broken)
const initials = computed(() => {
  const label = (props.user.name || props.user.email || 'U').trim()
  const parts = label.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return label.slice(0, 2).toUpperCase() || 'U'
})
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0"
          >
            <Avatar class="h-8 w-8 rounded-lg">
              <AvatarImage :src="user.avatar" :alt="user.name" />
              <AvatarFallback class="rounded-lg">{{ initials }}</AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">{{ user.name }}</span>
              <span class="truncate text-xs">{{ user.email }}</span>
            </div>
            <ChevronsUpDown class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          class="w-(--reka-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <!-- User identity -->
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="h-8 w-8 rounded-lg">
                <AvatarImage :src="user.avatar" :alt="user.name" />
                <AvatarFallback class="rounded-lg">{{ initials }}</AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-medium">{{ user.name }}</span>
                <span class="truncate text-xs text-muted-foreground">{{ user.email }}</span>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem>
              <BadgeCheck class="size-4" />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem
              class="cursor-pointer"
              :disabled="pushBusy || pushStatus === 'denied' || pushStatus === 'unsupported'"
              @click="onNotificationsClick"
            >
              <Bell class="size-4" />
              <span class="flex-1">{{ pushLabel }}</span>
            </DropdownMenuItem>
            <p
              v-if="pushError || iosNeedsInstall"
              class="px-2 pb-1.5 text-[11px] leading-snug text-muted-foreground"
            >
              {{ pushError || 'Add Native Mail to your Home Screen to enable push on iOS.' }}
            </p>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <!-- Logout — calls sessionStore.logout() which clears cookie + redirects -->
          <DropdownMenuItem
            class="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
            @click="sessionStore.logout()"
          >
            <LogOut class="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
