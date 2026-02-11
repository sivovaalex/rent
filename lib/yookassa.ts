/**
 * YooKassa Payment API Client
 * REST API integration for payment processing
 * Docs: https://yookassa.ru/developers/api
 */

import axios from 'axios';
import crypto from 'crypto';

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';
const SHOP_ID = process.env.YOOKASSA_SHOP_ID || '';
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://arendol.ru';

// === Types ===

export interface YooKassaAmount {
  value: string;   // "100.00"
  currency: string; // "RUB"
}

export interface YooKassaConfirmation {
  type: 'redirect';
  confirmation_url?: string;  // In response — URL to redirect user to
  return_url?: string;        // In request — URL to return after payment
}

export interface YooKassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: YooKassaAmount;
  description?: string;
  confirmation?: YooKassaConfirmation;
  metadata?: Record<string, string>;
  created_at: string;
  paid: boolean;
}

export interface YooKassaWebhookEvent {
  type: 'notification';
  event: 'payment.succeeded' | 'payment.canceled' | 'payment.waiting_for_capture';
  object: YooKassaPayment;
}

export interface CreatePaymentParams {
  amount: number;        // commission amount in rubles
  bookingId: string;
  description: string;
  returnUrl?: string;
}

// === Functions ===

function getAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');
}

/**
 * Create a YooKassa payment for the booking commission.
 * Returns the payment object with confirmation_url for redirect.
 * Idempotency key is derived from bookingId to prevent duplicate payments on retry.
 */
export async function createPayment(params: CreatePaymentParams): Promise<YooKassaPayment> {
  const idempotencyKey = crypto.createHash('sha256')
    .update(`payment:${params.bookingId}:${params.amount}`)
    .digest('hex');
  const returnUrl = params.returnUrl || `${BASE_URL}/payment/result?bookingId=${params.bookingId}`;

  const response = await axios.post<YooKassaPayment>(
    `${YOOKASSA_API_URL}/payments`,
    {
      amount: {
        value: params.amount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      capture: true,
      description: params.description,
      metadata: {
        bookingId: params.bookingId,
      },
    },
    {
      headers: {
        'Authorization': getAuthHeader(),
        'Idempotence-Key': idempotencyKey,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

/**
 * Get payment status from YooKassa
 */
export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
  const response = await axios.get<YooKassaPayment>(
    `${YOOKASSA_API_URL}/payments/${paymentId}`,
    {
      headers: {
        'Authorization': getAuthHeader(),
      },
    }
  );

  return response.data;
}

/**
 * Validate YooKassa webhook source by IP range.
 * YooKassa sends webhooks from: 185.71.76.0/27, 185.71.77.0/27,
 * 77.75.153.0/25, 77.75.156.11, 77.75.156.35, 77.75.154.128/25
 * Exact IPs: 185.71.76.0-31, 185.71.77.0-31, 77.75.153.0-127,
 * 77.75.154.128-255, 77.75.156.11, 77.75.156.35
 */
export function isYooKassaIP(ip: string): boolean {
  if (process.env.NODE_ENV === 'development') return true;

  // Exact single IPs
  const exactIPs = ['77.75.156.11', '77.75.156.35'];
  if (exactIPs.includes(ip)) return true;

  // CIDR ranges as prefix checks with octet validation
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p))) return false;

  const [a, b, c, d] = parts;

  // 185.71.76.0/27 → 185.71.76.0-31
  if (a === 185 && b === 71 && c === 76 && d >= 0 && d <= 31) return true;
  // 185.71.77.0/27 → 185.71.77.0-31
  if (a === 185 && b === 71 && c === 77 && d >= 0 && d <= 31) return true;
  // 77.75.153.0/25 → 77.75.153.0-127
  if (a === 77 && b === 75 && c === 153 && d >= 0 && d <= 127) return true;
  // 77.75.154.128/25 → 77.75.154.128-255
  if (a === 77 && b === 75 && c === 154 && d >= 128 && d <= 255) return true;

  return false;
}

/**
 * Check if YooKassa is configured with real credentials.
 * Logs a warning in production if mock payment will be used.
 */
export function isYooKassaConfigured(): boolean {
  const configured = !!(
    SHOP_ID &&
    SECRET_KEY &&
    SHOP_ID !== 'test-shop-id' &&
    !SHOP_ID.startsWith('your-')
  );

  if (!configured && process.env.NODE_ENV === 'production') {
    console.warn('[YOOKASSA] WARNING: YooKassa is NOT configured in production! Mock payments active.');
  }

  return configured;
}
