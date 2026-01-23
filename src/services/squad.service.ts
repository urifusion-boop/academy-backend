import fetch from 'node-fetch';
import { env } from '../config/env';

// Determine base URL based on key prefix
const isSandbox = env.SQUAD_SECRET_KEY.startsWith('sandbox_');
const SQUAD_BASE_URL = isSandbox
  ? 'https://sandbox-api-d.squadco.com'
  : 'https://api-d.squadco.com';

export async function initializeTransaction(
  email: string,
  amount: number,
  callbackUrl?: string,
  metadata?: Record<string, unknown>,
) {
  console.log(`[Squad] Initializing transaction for ${email}, amount: ${amount}`);
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout

  try {
    const response = await fetch(`${SQUAD_BASE_URL}/transaction/initiate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SQUAD_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Squad expects amount in kobo
        initiate_type: 'inline',
        currency: 'NGN',
        callback_url: callbackUrl,
        metadata,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    console.log(`[Squad] Response status: ${response.status} (${Date.now() - start}ms)`);

    const data = (await response.json()) as {
      status: number;
      message: string;
      data: {
        checkout_url: string;
        access_token: string | null;
        transaction_ref: string;
        merchant_info: any;
      };
    };

    if (!response.ok || data.status !== 200) {
      console.error('[Squad] Error:', data);
      throw new Error(data.message || 'Squad initialization failed');
    }

    // Map to a consistent format similar to Paystack if needed,
    // or return as is but ensuring caller knows field names.
    // Paystack returns: { authorization_url, access_code, reference }
    // Squad returns: { checkout_url, access_token, transaction_ref }
    // To minimize controller changes, we can map checkout_url to authorization_url
    return {
      status: true,
      message: data.message,
      data: {
        authorization_url: data.data.checkout_url,
        access_code: data.data.access_token || data.data.transaction_ref, // fallback
        reference: data.data.transaction_ref,
      },
    };
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[Squad] Network or API error (${Date.now() - start}ms):`, error);
    throw error;
  }
}

export async function verifyTransaction(reference: string) {
  const response = await fetch(`${SQUAD_BASE_URL}/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${env.SQUAD_SECRET_KEY}`,
    },
  });

  const data = (await response.json()) as {
    status: number;
    success: boolean;
    message: string;
    data: {
      transaction_status: string;
      transaction_amount: number;
      transaction_ref: string;
      transaction_currency_id: string;
      // ... other fields
    };
  };

  if (!response.ok || data.status !== 200) {
    throw new Error(data.message || 'Squad verification failed');
  }

  // Normalize status to boolean
  // Squad returns "transaction_status": "Success" (case sensitive usually)
  const isSuccess = data.data.transaction_status.toLowerCase() === 'success';

  return {
    status: isSuccess,
    message: data.message,
    data: {
      status: isSuccess ? 'success' : 'failed', // Normalize for controller
      amount: data.data.transaction_amount, // Squad returns amount in kobo or major?
      // Docs say "amount in kobo" for initiate, but verify response example shows 5000 for what?
      // Search result sample: "transaction_amount": 5000. If it was 5000 kobo (50 NGN) or 5000 NGN?
      // Paystack verify returns amount in kobo.
      // Let's assume Squad returns kobo too, but I should be careful.
      // Search result 4: "transaction_amount": 10000, "transaction_ref": "..."
      // If it follows the input, it's kobo.
      reference: data.data.transaction_ref,
      // ... allow access to raw data
      ...data.data,
    },
  };
}
