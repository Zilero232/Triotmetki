import { Injectable } from '@nestjs/common';

import { createJobSchedules } from '../../../common/schedules';
import { SHOP_SCHEDULES } from '../config/queue.constants';

@Injectable()
export class ShopSchedulesService extends createJobSchedules({ schedules: SHOP_SCHEDULES, label: 'shop' }) {}
