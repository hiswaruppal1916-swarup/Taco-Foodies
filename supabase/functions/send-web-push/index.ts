import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "BMToeg-mX6R2aPHY4DWL9QzKEPWyqCMY76m7QvbMf0jI_DwDZutH8-EQ7QPrgxTN8OGqbwFP42QPGGvwn3acJVg";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "1_-4lJuezDMdur0BHgJQF7AdEu_zJFM-2iOpUCy14dI";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:tacofoodiesowner@gmail.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://mqbngtgwejzammhdwczl.supabase.co";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, order, order_number, status } = body;

    let notificationPayload = {
      title: "🔔 TACO Foodies Update",
      body: "You have a new update from TACO Foodies.",
      icon: "/images/android-chrome-192x192.png",
      badge: "/images/android-chrome-192x192.png",
      data: {
        url: "/",
        timestamp: Date.now()
      }
    };

    let targetSubs: any[] = [];

    // CASE 1: New order placed -> Notify ALL Owner/Admin registered devices
    if (action === "new_order" || action === "newOrder") {
      const ordNum = order?.order_number || order?.id || "TF-Order";
      const ordType = (order?.order_type === "home_delivery" || order?.type === "Home Delivery") ? "Home Delivery" : `Table ${order?.table_number || order?.table || 1}`;
      const totalAmt = order?.total || order?.grandTotal || 0;

      notificationPayload = {
        title: "🔔 New Order Received!",
        body: `Order #${ordNum} • ${ordType} • Total: ₹${totalAmt}`,
        icon: "/images/android-chrome-192x192.png",
        badge: "/images/android-chrome-192x192.png",
        data: {
          url: "/#owner-dashboard",
          orderNumber: ordNum,
          type: "owner_new_order",
          timestamp: Date.now()
        }
      };

      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("role", "owner");

      if (error) {
        console.error("Error fetching owner subscriptions:", error.message);
      } else {
        targetSubs = data || [];
      }
    }
    // CASE 2: Order status changed by Owner -> Notify customer devices associated with this order
    else if (action === "order_status_changed" || action === "statusUpdate") {
      const ordNum = order_number || order?.order_number || order?.id;
      const currentStatus = (status || "").toLowerCase();

      let statusTitle = "🔔 Order Update";
      let statusBody = `Your order #${ordNum} has been updated to: ${status}`;

      if (currentStatus === "accepted" || currentStatus === "confirmed") {
        statusTitle = "✅ Order Accepted";
        statusBody = `Your order #${ordNum} has been accepted by TACO Foodies!`;
      } else if (currentStatus === "preparing") {
        statusTitle = "👨‍🍳 Preparing Your Order";
        statusBody = `Chefs are preparing your order #${ordNum} fresh in the kitchen!`;
      } else if (currentStatus === "ready" || currentStatus === "transit_ready") {
        statusTitle = "🍽️ Order Ready";
        statusBody = `Your order #${ordNum} is ready for serving/pickup!`;
      } else if (currentStatus === "serving" || currentStatus === "delivering") {
        statusTitle = "🚚 Out for Delivery / Serving";
        statusBody = `Your order #${ordNum} is on the way!`;
      } else if (currentStatus === "completed") {
        statusTitle = "🎉 Order Completed";
        statusBody = `Thank you for dining with TACO Foodies! Enjoy your food.`;
      } else if (currentStatus === "cancelled" || currentStatus === "unavailable") {
        statusTitle = "❌ Order Cancelled";
        statusBody = `Your order #${ordNum} was cancelled by the restaurant.`;
      } else if (currentStatus === "advance_paid") {
        statusTitle = "💳 Advance Payment Confirmed";
        statusBody = `Your 30% advance payment for order #${ordNum} was verified!`;
      } else if (currentStatus === "payment_pending") {
        statusTitle = "⏳ Advance Payment Required";
        statusBody = `Please submit your advance payment for order #${ordNum}.`;
      }

      notificationPayload = {
        title: statusTitle,
        body: statusBody,
        icon: "/images/android-chrome-192x192.png",
        badge: "/images/android-chrome-192x192.png",
        data: {
          url: "/#my-orders",
          orderNumber: ordNum,
          type: "customer_status_update",
          timestamp: Date.now()
        }
      };

      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("order_number", ordNum);

      if (error) {
        console.error("Error fetching customer subscriptions:", error.message);
      } else {
        targetSubs = data || [];
      }
    }
    // CASE 3: Test Push Notification
    else if (action === "test") {
      notificationPayload = {
        title: "🌮 TACO Foodies Test Notification",
        body: "Push Notifications are successfully active on this device!",
        icon: "/images/android-chrome-192x192.png",
        badge: "/images/android-chrome-192x192.png",
        data: {
          url: "/",
          timestamp: Date.now()
        }
      };

      if (body.endpoint) {
        targetSubs = [{ endpoint: body.endpoint, p256dh: body.p256dh, auth: body.auth }];
      }
    }

    let sentCount = 0;
    const errors: any[] = [];

    // Send push notification to each target subscription
    for (const sub of targetSubs) {
      if (!sub.endpoint || !sub.p256dh || !sub.auth) continue;

      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        }
      };

      try {
        await webpush.sendNotification(pushSub, JSON.stringify(notificationPayload));
        sentCount++;
      } catch (err: any) {
        console.warn(`[WebPush] Failed for endpoint: ${sub.endpoint?.substring(0, 30)}... status: ${err.statusCode}`);
        errors.push({ endpoint: sub.endpoint, status: err.statusCode, message: err.message });

        // HTTP 410 Gone or 404 Not Found indicates subscription expired / uninstalled
        if (err.statusCode === 410 || err.statusCode === 404) {
          if (sub.id) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            console.log(`[WebPush] Removed expired subscription ID: ${sub.id}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        sent: sentCount,
        total: targetSubs.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (err: any) {
    console.error("[WebPush Edge Function Error]", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
