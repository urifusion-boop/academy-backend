import fetch from 'node-fetch';
import { env } from '../config/env';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export async function initializeTransaction(
  email: string,
  amount: number,
  callbackUrl?: string,
  metadata?: Record<string, unknown>,
) {
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

  const data = (await response.json()) as {
    status: boolean;
    message: string;
    data: { authorization_url: string; access_code: string; reference: string };
  };

  if (!response.ok) {
    throw new Error(data.message || 'Paystack initialization failed');
  }

  return data;
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
