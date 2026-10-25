/// <reference lib="webworker" />
import type { PrecacheEntry } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | PrecacheEntry)[]
}

interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: (string | PrecacheEntry)[]
}
