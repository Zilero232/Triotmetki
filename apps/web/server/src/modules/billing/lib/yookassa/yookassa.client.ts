import type { HttpClientService } from '../../../../core';
import type {
  ChargeSavedMethodInput,
  CreatePaymentInput,
  YooKassaClientInput,
  YooKassaCredentials,
  YooKassaPayment,
  YooKassaRequestInput
} from './yookassa.types';

import { AppBadRequestException, AppNotFoundException } from '../../../../common/exceptions';
import { errorMessage } from '../../../../common/lib';
import { YOOKASSA } from '../../config/yookassa.constants';
import { toAmount } from './yookassa';
import { yookassaPaymentSchema } from './yookassa.schemas';

export class YooKassaClient {
  private readonly credentials: YooKassaCredentials;
  private readonly http: HttpClientService;

  constructor({ credentials, http }: YooKassaClientInput) {
    this.credentials = credentials;
    this.http = http;
  }

  get isConfigured(): boolean {
    return Boolean(this.credentials.shopId && this.credentials.secretKey);
  }

  createPayment({ amountRub, description, returnUrl, idempotenceKey, savePaymentMethod, metadata }: CreatePaymentInput): Promise<YooKassaPayment> {
    return this.request({
      path: '/payments',
      method: 'post',
      idempotenceKey,
      json: {
        amount: toAmount(amountRub),
        capture: true,
        description,
        metadata,
        save_payment_method: savePaymentMethod,
        confirmation: { type: 'redirect', return_url: returnUrl }
      }
    });
  }

  chargeSavedMethod({ amountRub, description, paymentMethodId, idempotenceKey, metadata }: ChargeSavedMethodInput): Promise<YooKassaPayment> {
    return this.request({
      path: '/payments',
      method: 'post',
      idempotenceKey,
      json: { amount: toAmount(amountRub), capture: true, description, metadata, payment_method_id: paymentMethodId }
    });
  }

  getPayment(paymentId: string): Promise<YooKassaPayment> {
    return this.request({ path: `/payments/${encodeURIComponent(paymentId)}`, method: 'get' });
  }

  private async request({ path, method, json, idempotenceKey }: YooKassaRequestInput): Promise<YooKassaPayment> {
    if (!this.isConfigured) {
      throw new AppNotFoundException('INTEGRATION_UNAVAILABLE', 'Payments are not configured on this server');
    }

    const authorization = `Basic ${Buffer.from(`${this.credentials.shopId}:${this.credentials.secretKey}`).toString('base64')}`;

    try {
      return await this.http.requestJson({
        url: `${YOOKASSA.apiUrl}${path}`,
        schema: yookassaPaymentSchema,
        options: {
          method,
          json,
          timeout: YOOKASSA.timeoutMs,
          headers: { authorization, ...(idempotenceKey ? { 'idempotence-key': idempotenceKey } : {}) }
        }
      });
    } catch (error) {
      throw new AppBadRequestException('PAYMENT_FAILED', `YooKassa ${method.toUpperCase()} ${path} failed: ${errorMessage(error)}`);
    }
  }
}
