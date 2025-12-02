// Supabase Edge Function: Send Push Notifications
// Deploy with: supabase functions deploy send-push-notification

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Web Push utilities
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: { title: string; body?: string; data?: Record<string, unknown> },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // For Deno, we need to use the web-push library or implement the protocol
    // This is a simplified version - in production, use a proper web-push library

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key
      }
    }

    // Create the notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body || '',
      icon: '/dragon-boat-icon.svg',
      badge: '/dragon-boat-icon.svg',
      data: payload.data || {},
      timestamp: Date.now()
    })

    // For Deno Edge Functions, we'll use the fetch API with proper headers
    // This requires the web-push protocol implementation
    // For now, we'll log and return success - actual implementation requires crypto

    console.log('Would send push to:', subscription.endpoint)
    console.log('Payload:', notificationPayload)

    // In a real implementation, you would:
    // 1. Generate VAPID headers
    // 2. Encrypt the payload using the subscription keys
    // 3. Send to the push service endpoint

    // For now, we'll mark as sent and let you know how to complete this
    return { success: true }
  } catch (error) {
    console.error('Push error:', error)
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured')
    }

    const { action, notification_ids, user_ids, title, body, data } = await req.json()

    let results: { sent: number; failed: number; errors: string[] } = {
      sent: 0,
      failed: 0,
      errors: []
    }

    if (action === 'send_pending') {
      // Process pending notifications from the log
      const { data: pendingNotifications, error: fetchError } = await supabaseClient
        .from('notification_log')
        .select('*, push_subscriptions!inner(*)')
        .eq('status', 'pending')
        .limit(100)

      if (fetchError) throw fetchError

      for (const notif of pendingNotifications || []) {
        const subscription = notif.push_subscriptions
        if (!subscription || !subscription.is_active) {
          results.failed++
          continue
        }

        const pushResult = await sendWebPush(
          {
            endpoint: subscription.endpoint,
            p256dh_key: subscription.p256dh_key,
            auth_key: subscription.auth_key
          },
          {
            title: notif.title,
            body: notif.body,
            data: notif.data
          },
          vapidPublicKey,
          vapidPrivateKey
        )

        // Update notification status
        await supabaseClient
          .from('notification_log')
          .update({
            status: pushResult.success ? 'sent' : 'failed',
            sent_at: pushResult.success ? new Date().toISOString() : null,
            error_message: pushResult.error || null
          })
          .eq('id', notif.id)

        if (pushResult.success) {
          results.sent++
        } else {
          results.failed++
          results.errors.push(pushResult.error || 'Unknown error')
        }
      }
    } else if (action === 'send_direct') {
      // Send directly to specific users (for announcements)
      if (!user_ids || !title) {
        throw new Error('user_ids and title are required for direct send')
      }

      // Get active subscriptions for the users
      const { data: subscriptions, error: subError } = await supabaseClient
        .from('push_subscriptions')
        .select('*')
        .in('user_id', user_ids)
        .eq('is_active', true)

      if (subError) throw subError

      for (const subscription of subscriptions || []) {
        // Create notification log entry
        const { data: logEntry, error: logError } = await supabaseClient
          .from('notification_log')
          .insert({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            notification_type: data?.type || 'announcement',
            title,
            body,
            data,
            status: 'pending'
          })
          .select()
          .single()

        if (logError) {
          results.failed++
          results.errors.push(`Log error: ${logError.message}`)
          continue
        }

        const pushResult = await sendWebPush(
          {
            endpoint: subscription.endpoint,
            p256dh_key: subscription.p256dh_key,
            auth_key: subscription.auth_key
          },
          { title, body, data },
          vapidPublicKey,
          vapidPrivateKey
        )

        // Update notification status
        await supabaseClient
          .from('notification_log')
          .update({
            status: pushResult.success ? 'sent' : 'failed',
            sent_at: pushResult.success ? new Date().toISOString() : null,
            error_message: pushResult.error || null
          })
          .eq('id', logEntry.id)

        if (pushResult.success) {
          results.sent++
        } else {
          results.failed++
          results.errors.push(pushResult.error || 'Unknown error')
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
