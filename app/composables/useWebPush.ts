/**
 * Browser Web Push ↔ Stalwart JMAP PushSubscription.
 *
 * Stalwart owns the VAPID key; we subscribe with PushManager, register the
 * endpoint via the BFF, and the service worker completes PushVerification.
 */

const DEVICE_KEY = 'nm_push_device_client_id'
const SUB_ID_KEY = 'nm_jmap_push_subscription_id'

export type WebPushStatus = 'unsupported' | 'denied' | 'default' | 'enabled' | 'disabled'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function getOrCreateDeviceClientId(): string {
  if (!import.meta.client) return 'native-mail-ssr'
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = `native-mail:${crypto.randomUUID()}`
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

function storedSubId(): string | null {
  if (!import.meta.client) return null
  return localStorage.getItem(SUB_ID_KEY)
}

function setStoredSubId(id: string | null) {
  if (!import.meta.client) return
  if (id) localStorage.setItem(SUB_ID_KEY, id)
  else localStorage.removeItem(SUB_ID_KEY)
}

/** Best-effort: destroy JMAP + browser push subscription (safe outside setup). */
export async function teardownWebPush(): Promise<void> {
  if (!import.meta.client) return
  const id = storedSubId()
  if (id) {
    await $fetch('/api/push/subscribe', {
      method: 'DELETE',
      query: { id },
    }).catch(() => {})
  }
  setStoredSubId(null)
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready.catch(() => null)
    const sub = await reg?.pushManager.getSubscription()
    await sub?.unsubscribe().catch(() => {})
  }
}

export function useWebPush() {
  const status = ref<WebPushStatus>('disabled')
  const busy = ref(false)
  const error = ref<string | null>(null)
  const iosNeedsInstall = ref(false)

  function detectSupport() {
    if (!import.meta.client) return false
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    iosNeedsInstall.value = isIOS && !standalone

    return 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window
  }

  function refreshStatus() {
    if (!import.meta.client) {
      status.value = 'unsupported'
      return
    }
    if (!detectSupport()) {
      status.value = iosNeedsInstall.value ? 'unsupported' : 'unsupported'
      return
    }
    const perm = Notification.permission
    if (perm === 'denied') {
      status.value = 'denied'
      return
    }
    if (storedSubId() && perm === 'granted') {
      status.value = 'enabled'
      return
    }
    status.value = perm === 'default' ? 'default' : 'disabled'
  }

  async function enable(): Promise<boolean> {
    if (!import.meta.client) return false
    error.value = null
    busy.value = true
    try {
      if (!detectSupport()) {
        error.value = iosNeedsInstall.value
          ? 'Install Native Mail to your Home Screen to enable notifications on iOS.'
          : 'Push notifications are not supported in this browser.'
        status.value = 'unsupported'
        return false
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        status.value = permission === 'denied' ? 'denied' : 'default'
        error.value = permission === 'denied'
          ? 'Notifications are blocked. Enable them in browser settings.'
          : 'Permission was not granted.'
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const { applicationServerKey } = await $fetch<{ applicationServerKey: string }>(
        '/api/push/config',
      )

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(applicationServerKey) as BufferSource,
        })
      }

      const json = sub.toJSON()
      const p256dh = json.keys?.p256dh
      const auth = json.keys?.auth
      if (!json.endpoint || !p256dh || !auth) {
        throw new Error('Push subscription missing endpoint or keys')
      }

      // Replace any previous JMAP subscription for this browser
      const prev = storedSubId()
      if (prev) {
        await $fetch('/api/push/subscribe', {
          method: 'DELETE',
          query: { id: prev },
        }).catch(() => {})
      }

      const { id } = await $fetch<{ id: string }>('/api/push/subscribe', {
        method: 'POST',
        body: {
          deviceClientId: getOrCreateDeviceClientId(),
          endpoint: json.endpoint,
          keys: { p256dh, auth },
          expires: json.expirationTime
            ? new Date(json.expirationTime).toISOString()
            : null,
        },
      })

      setStoredSubId(id)
      status.value = 'enabled'
      return true
    }
    catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : (err as { data?: { statusMessage?: string }; statusMessage?: string })?.data?.statusMessage
          ?? (err as { statusMessage?: string })?.statusMessage
          ?? 'Failed to enable notifications'
      error.value = msg
      refreshStatus()
      return false
    }
    finally {
      busy.value = false
    }
  }

  async function disable(): Promise<void> {
    if (!import.meta.client) return
    error.value = null
    busy.value = true
    try {
      const id = storedSubId()
      if (id) {
        await $fetch('/api/push/subscribe', {
          method: 'DELETE',
          query: { id },
        }).catch(() => {})
      }
      setStoredSubId(null)

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready.catch(() => null)
        const sub = await reg?.pushManager.getSubscription()
        await sub?.unsubscribe().catch(() => {})
      }
      status.value = Notification.permission === 'denied' ? 'denied' : 'disabled'
    }
    finally {
      busy.value = false
    }
  }

  async function toggle(): Promise<void> {
    if (status.value === 'enabled') await disable()
    else await enable()
  }

  onMounted(() => {
    refreshStatus()
  })

  return {
    status,
    busy,
    error,
    iosNeedsInstall,
    refreshStatus,
    enable,
    disable,
    toggle,
    teardownOnLogout: teardownWebPush,
  }
}
