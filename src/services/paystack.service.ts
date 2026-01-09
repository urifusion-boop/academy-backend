import fetch from 'node-fetch';
import { env } from '../config/env';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export async function initializeTransaction(
  email: string,
  amount: number,
  callbackUrl?: string,
  metadata?: Record<string, unknown>,
) {
  console.log(`[Paystack] Initializing transaction for ${email}, amount: ${amount}`);
  const start = Date.now();
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Paystack expects amount in kobo
        callback_url: callbackUrl,
        metadata,
      }),
    });

    console.log(`[Paystack] Response status: ${response.status} (${Date.now() - start}ms)`);

    const data = (await response.json()) as {
      status: boolean;
      message: string;
      data: { authorization_url: string; access_code: string; reference: string };
    };

    if (!response.ok) {
      console.error('[Paystack] Error:', data);
      throw new Error(data.message || 'Paystack initialization failed');
    }

    return data;
  } catch (error) {
    console.error(`[Paystack] Network or API error (${Date.now() - start}ms):`, error);
    throw error;
  }
}

export async function verifyTransaction(reference: string) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    },
  });

  const data = (await response.json()) as { status: boolean; message: string; data: unknown };

  if (!response.ok) {
    throw new Error(data.message || 'Paystack verification failed');
  }

  return data;
}
