/**
 * TACO Foodies — Free Web Push Notification Manager
 * Integrates Web Push API, VAPID, Service Worker, and Supabase Edge Functions.
 * 
 * Safety Guarantees:
 * - Completely zero-cost implementation using standard Web Push API & VAPID.
 * - Non-blocking: Notification failures NEVER disrupt ordering or admin actions.
 * - Multiple devices supported for Owner/Admin.
 * - Anonymous order-based push for Customers (no login required).
 */

class PushNotificationManager {
  constructor() {
    this.vapidPublicKey = 'BMToeg-mX6R2aPHY4DWL9QzKEPWyqCMY76m7QvbMf0jI_DwDZutH8-EQ7QPrgxTN8OGqbwFP42QPGGvwn3acJVg';
    this.edgeFunctionUrl = 'https://mqbngtgwejzammhdwczl.supabase.co/functions/v1/send-web-push';
    this.isSubscribed = false;
  }

  // Convert base64 VAPID string to Uint8Array required by pushManager.subscribe
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
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

  isSupported() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  getPermission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  async getRegistration() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      return await navigator.serviceWorker.ready;
    } catch (e) {
      console.warn('[WebPush] Error getting SW registration:', e);
      return null;
    }
  }

  async getExistingSubscription() {
    const reg = await this.getRegistration();
    if (!reg || !reg.pushManager) return null;
    try {
      return await reg.pushManager.getSubscription();
    } catch (e) {
      console.warn('[WebPush] Error fetching existing subscription:', e);
      return null;
    }
  }

  // Helper to extract clean push subscription keys
  extractSubscriptionData(subscription) {
    if (!subscription) return null;
    const rawKey = subscription.getKey ? subscription.getKey('p256dh') : null;
    const rawAuth = subscription.getKey ? subscription.getKey('auth') : null;

    const p256dh = rawKey
      ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey)))
      : '';
    const auth = rawAuth
      ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuth)))
      : '';

    return {
      endpoint: subscription.endpoint,
      p256dh,
      auth
    };
  }

  // ============================================================================
  // OWNER / ADMIN PUSH NOTIFICATIONS
  // ============================================================================

  async subscribeOwner() {
    if (!this.isSupported()) {
      alert('Web Push notifications are not supported by this browser.');
      return false;
    }

    try {
      // 1. Request Permission explicitly upon user action
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        alert('Notification permission was denied. Please allow notifications in your browser settings to receive order alerts.');
        this.updateOwnerUI();
        return false;
      }

      // 2. Obtain / create PushSubscription using VAPID Public Key
      const reg = await this.getRegistration();
      if (!reg || !reg.pushManager) {
        alert('Service Worker is not ready. Please refresh the page and try again.');
        return false;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      const subData = this.extractSubscriptionData(sub);
      if (!subData.endpoint || !subData.p256dh || !subData.auth) {
        alert('Could not retrieve push keys. Please try again.');
        return false;
      }

      // 3. Save subscription in Supabase with role = 'owner'
      if (typeof supabaseService !== 'undefined') {
        const client = supabaseService.getClient();
        if (client) {
          let userId = null;
          try {
            const { data: { session } } = await client.auth.getSession();
            if (session && session.user) {
              userId = session.user.id;
            }
          } catch (e) {}

          const record = {
            endpoint: subData.endpoint,
            p256dh: subData.p256dh,
            auth: subData.auth,
            role: 'owner',
            user_id: userId,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
          };

          const { error } = await client
            .from('push_subscriptions')
            .upsert([record], { onConflict: 'endpoint' });

          if (error) {
            console.warn('[WebPush] Error storing owner subscription in DB:', error.message);
          } else {
            console.log('✅ Owner device registered for Web Push notifications');
          }
        }
      }

      this.isSubscribed = true;
      this.updateOwnerUI();

      if (typeof cartSystem !== 'undefined' && cartSystem.showToastNotification) {
        cartSystem.showToastNotification('🔔 Order notifications enabled on this device!');
      } else {
        alert('🔔 Notifications Enabled! This device will receive instant alerts for new orders.');
      }

      return true;
    } catch (e) {
      console.error('[WebPush] Owner subscription exception:', e);
      alert('Failed to enable notifications: ' + (e.message || 'Unknown error'));
      return false;
    }
  }

  async unsubscribeOwner() {
    try {
      const sub = await this.getExistingSubscription();
      if (sub) {
        if (typeof supabaseService !== 'undefined') {
          const client = supabaseService.getClient();
          if (client) {
            await client.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        }
        await sub.unsubscribe();
      }
      this.isSubscribed = false;
      this.updateOwnerUI();
      alert('Order notifications have been disabled on this device.');
    } catch (e) {
      console.warn('[WebPush] Unsubscribe exception:', e);
    }
  }

  async toggleOwnerNotifications() {
    const sub = await this.getExistingSubscription();
    if (sub && Notification.permission === 'granted') {
      if (confirm('Do you want to disable order notifications on this device?')) {
        await this.unsubscribeOwner();
      }
    } else {
      await this.subscribeOwner();
    }
  }

  async updateOwnerUI() {
    const btn = document.getElementById('ownerPushNotifyBtn');
    if (!btn) return;

    if (!this.isSupported()) {
      btn.style.display = 'none';
      return;
    }

    const sub = await this.getExistingSubscription();
    const isGranted = Notification.permission === 'granted' && sub;

    if (isGranted) {
      btn.innerHTML = '🔔 Notifications Active ✓';
      btn.classList.add('active');
      btn.title = 'Order notifications active on this device. Click to manage.';
      btn.style.borderColor = '#4caf50';
      btn.style.color = '#4caf50';
    } else {
      btn.innerHTML = '🔔 Enable Order Notifications';
      btn.classList.remove('active');
      btn.title = 'Click to receive instant sound & screen notifications when new orders arrive';
      btn.style.borderColor = '';
      btn.style.color = '';
    }
  }

  // ============================================================================
  // CUSTOMER PUSH NOTIFICATIONS (ANONYMOUS & ORDER-BASED)
  // ============================================================================

  async subscribeCustomer(orderNumber, trackingToken = null) {
    if (!this.isSupported()) return false;
    if (!orderNumber) return false;

    try {
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        return false;
      }

      const reg = await this.getRegistration();
      if (!reg || !reg.pushManager) return false;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      const subData = this.extractSubscriptionData(sub);
      if (!subData.endpoint) return false;

      if (typeof supabaseService !== 'undefined') {
        const client = supabaseService.getClient();
        if (client) {
          const resolvedToken = trackingToken || (typeof orderTracker !== 'undefined' && orderTracker.getTrackingToken ? orderTracker.getTrackingToken(orderNumber) : null);
          const record = {
            endpoint: subData.endpoint,
            p256dh: subData.p256dh,
            auth: subData.auth,
            role: 'customer',
            order_number: String(orderNumber).trim(),
            tracking_token: resolvedToken,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
          };

          const { error } = await client
            .from('push_subscriptions')
            .upsert([record], { onConflict: 'endpoint' });

          if (error) {
            console.warn('[WebPush] Customer subscription store error:', error.message);
          } else {
            console.log(`✅ Customer device subscribed to order updates for #${orderNumber}`);
          }
        }
      }

      if (typeof cartSystem !== 'undefined' && cartSystem.showToastNotification) {
        cartSystem.showToastNotification(`🔔 Notifications enabled for Order #${orderNumber}!`);
      }

      // Hide or update customer prompt buttons
      const promptElements = document.querySelectorAll(`.customer-push-prompt-${orderNumber}`);
      promptElements.forEach(el => {
        el.innerHTML = '🔔 Notifications Active for this Order ✓';
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.8';
      });

      return true;
    } catch (e) {
      console.warn('[WebPush] Customer subscription error (non-fatal):', e);
      return false;
    }
  }

  // ============================================================================
  // TRIGGER SERVER-SIDE PUSH DISPATCH (FAIL-SAFE, NON-BLOCKING)
  // ============================================================================

  async sendNewOrderNotification(order) {
    if (!order) return;

    // Fail-safe asynchronous background dispatch
    setTimeout(async () => {
      try {
        const payload = {
          action: 'new_order',
          order: {
            order_number: order.order_number || order.id,
            type: order.type,
            order_type: order.type === 'Home Delivery' ? 'home_delivery' : 'dine_in',
            table_number: order.table || order.table_number,
            total: order.grandTotal || order.total || 0,
            customerName: order.customerName || order.customer_name || 'Customer',
            address: order.address || order.delivery_address || ''
          }
        };

        const headers = {
          'Content-Type': 'application/json'
        };

        if (typeof supabaseService !== 'undefined') {
          headers['apikey'] = supabaseService.supabaseAnonKey;
          headers['Authorization'] = `Bearer ${supabaseService.supabaseAnonKey}`;
        }

        const res = await fetch(this.edgeFunctionUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          console.warn('[WebPush] Edge Function returned HTTP', res.status);
        } else {
          const result = await res.json();
          console.log('⚡ Web Push sent to Owner devices:', result);
        }
      } catch (err) {
        console.warn('[WebPush] Send new order push failed (non-fatal):', err);
      }
    }, 100);
  }

  async sendStatusChangeNotification(orderId, newStatus) {
    if (!orderId || !newStatus) return;

    // Fail-safe asynchronous background dispatch
    setTimeout(async () => {
      try {
        const cleanId = String(orderId).trim();
        const payload = {
          action: 'order_status_changed',
          order_number: cleanId,
          status: newStatus
        };

        const headers = {
          'Content-Type': 'application/json'
        };

        if (typeof supabaseService !== 'undefined') {
          headers['apikey'] = supabaseService.supabaseAnonKey;
          headers['Authorization'] = `Bearer ${supabaseService.supabaseAnonKey}`;
        }

        const res = await fetch(this.edgeFunctionUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          console.warn('[WebPush] Edge Function status push returned HTTP', res.status);
        } else {
          const result = await res.json();
          console.log(`⚡ Web Push status change '${newStatus}' sent to Customer:`, result);
        }
      } catch (err) {
        console.warn('[WebPush] Send status change push failed (non-fatal):', err);
      }
    }, 100);
  }
}

const pushNotificationManager = new PushNotificationManager();
