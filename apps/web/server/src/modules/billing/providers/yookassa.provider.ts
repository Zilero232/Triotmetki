import { AppConfigService } from '../../../config';
import { HttpClientService } from '../../../core';
import { YooKassaClient } from '../lib/yookassa';

export const yooKassaProvider = {
  provide: YooKassaClient,
  inject: [AppConfigService, HttpClientService],
  useFactory: (config: AppConfigService, http: HttpClientService) =>
    new YooKassaClient({ credentials: { shopId: config.get('YOOKASSA_SHOP_ID'), secretKey: config.get('YOOKASSA_SECRET_KEY') }, http })
};
