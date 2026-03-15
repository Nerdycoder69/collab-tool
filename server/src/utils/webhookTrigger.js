import crypto from 'crypto';
import Webhook from '../models/Webhook.js';

/**
 * Fire all matching webhooks for a given event.
 * Runs asynchronously — does not block the caller.
 */
export async function fireWebhooks({ event, workspaceId, boardId, payload }) {
  try {
    const query = { event, enabled: true, workspace: workspaceId };
    // Match webhooks scoped to this board OR workspace-wide (no board filter)
    const webhooks = await Webhook.find({
      ...query,
      $or: [{ board: boardId }, { board: { $exists: false } }, { board: null }],
    });

    for (const webhook of webhooks) {
      deliverWebhook(webhook, payload).catch((err) => {
        console.error(`Webhook delivery failed [${webhook.name}]:`, err.message);
      });
    }
  } catch (err) {
    console.error('Webhook query error:', err.message);
  }
}

async function deliverWebhook(webhook, payload) {
  const body = JSON.stringify({
    event: webhook.event,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  const headers = {
    'Content-Type': 'application/json',
    'X-CollabBoard-Event': webhook.event,
  };

  // Sign the payload if a secret is configured
  if (webhook.secret) {
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex');
    headers['X-CollabBoard-Signature'] = `sha256=${signature}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`Webhook [${webhook.name}] returned ${res.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
