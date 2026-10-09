/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

import { defaultCache } from '@serwist/turbopack/worker';
import { Serwist } from 'serwist';
import * as z from 'zod';

import { PWA } from '../shared/config/pwa';
import { sameOriginCaching } from '../shared/lib/same-origin-caching';

declare const self: ServiceWorkerGlobalScope & SerwistGlobalConfig & { __SW_MANIFEST: (string | PrecacheEntry)[] | undefined };

const pushPayloadSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  url: z.string().nullish(),
  tag: z.string().optional()
});

const notificationDataSchema = z.object({ url: z.string() });

const readPushPayload = (event: PushEvent) => {
  try {
    return pushPayloadSchema.safeParse(event.data?.json()).data;
  } catch {
    return undefined;
  }
};

const focusOrOpen = async (url: string) => {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const exact = windows.find((client) => client.url === url);

  if (exact) {
    return exact.focus();
  }

  const [first] = windows;

  if (first) {
    const navigated = await first.navigate(url);

    return (navigated ?? first).focus();
  }

  return self.clients.openWindow(url);
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: sameOriginCaching(defaultCache)
});

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event);

  if (!payload) {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: PWA.icon,
      badge: PWA.badge,
      tag: payload.tag,
      data: { url: payload.url ?? PWA.startUrl }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const path = notificationDataSchema.safeParse(event.notification.data).data?.url ?? PWA.startUrl;

  event.waitUntil(focusOrOpen(new URL(path, self.location.origin).href));
});

serwist.addEventListeners();
