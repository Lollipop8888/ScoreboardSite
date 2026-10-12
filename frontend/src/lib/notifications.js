import { notificationApi } from './api';

// VAPID public key for web push notifications (must match backend/notifications.py)
const VAPID_PUBLIC_KEY = 'BPmdvQmzKsfRYLqzL-CKmVC1TimdNoTro7zVTVZWJjx9SctszKqByW9_I2przLSI2QchrNsX2Kb4cj0GWO7cZEU';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArraysEqual(a, b) {
  if (!a || !b || a.byteLength !== b.byteLength) return false;
  const av = new Uint8Array(a);
  const bv = new Uint8Array(b);
  for (let i = 0; i < av.length; i++) if (av[i] !== bv[i]) return false;
  return true;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Detect iOS (iPhone/iPad). iOS requires the site to be installed to Home Screen
// (standalone mode) to allow web push (iOS 16.4+).
export function isIOS() {
  const ua = navigator.userAgent || '';
  const isIPadOS = ua.includes('Macintosh') && 'ontouchend' in document;
  return /iPhone|iPad|iPod/.test(ua) || isIPadOS;
}

export function isStandalone() {
  return (
    (typeof navigator !== 'undefined' && navigator.standalone === true) ||
    (typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(display-mode: standalone)').matches)
  );
}

// Returns null if supported, or a string explaining why push isn't available.
export function getPushUnsupportedReason() {
  if (!('serviceWorker' in navigator)) return 'Service workers are not supported in this browser.';
  if (!('PushManager' in window)) return 'Push notifications are not supported in this browser.';
  if (!('Notification' in window)) return 'Notifications are not supported in this browser.';
  if (isIOS() && !isStandalone()) {
    return 'On iOS, you must add this site to your Home Screen first (Share \u2192 Add to Home Screen), then open it from the icon. Requires iOS 16.4 or newer.';
  }
  return null;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('Notifications denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPush() {
  try {
    const registration = await navigator.serviceWorker.ready;

    const targetKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    // Check if already subscribed with the CURRENT applicationServerKey.
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const existingKey = subscription.options && subscription.options.applicationServerKey;
      if (!uint8ArraysEqual(existingKey, targetKey)) {
        // Stale subscription from a previous VAPID key - drop it.
        try {
          await notificationApi.unsubscribe(subscription.endpoint);
        } catch (_) { /* ignore */ }
        await subscription.unsubscribe();
        subscription = null;
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: targetKey,
      });
    }

    // Send subscription to server
    const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh'))));
    const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))));

    await notificationApi.subscribe({
      endpoint: subscription.endpoint,
      p256dh: p256dh,
      auth: auth
    });

    console.log('Push subscription successful');
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await notificationApi.unsubscribe(subscription.endpoint);
      await subscription.unsubscribe();
      console.log('Push unsubscription successful');
    }
    return true;
  } catch (error) {
    console.error('Push unsubscription failed:', error);
    return false;
  }
}

export async function isPushSubscribed() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

// Show a local notification (for testing or when push isn't available)
export function showLocalNotification(title, options = {}) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      ...options
    });
  }
}
