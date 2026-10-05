import { Controller, Get, Post } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { OperationIdPrefix } from '../operation-id-prefix.decorator';

const API_OPERATION = 'swagger/apiOperation';

@OperationIdPrefix('LegacyController')
@Controller('things')
class ThingsController {
  @Get()
  list() {
    return [];
  }

  @Post()
  create() {
    return {};
  }
}

const operationOf = (handler: object): unknown => Reflect.getMetadata(API_OPERATION, handler);

describe('OperationIdPrefix', () => {
  it('names every handler after the given controller instead of the class', () => {
    expect(operationOf(ThingsController.prototype.list)).toEqual({ operationId: 'LegacyController_list' });
    expect(operationOf(ThingsController.prototype.create)).toEqual({ operationId: 'LegacyController_create' });
  });

  it('leaves the constructor alone', () => {
    expect(operationOf(ThingsController)).toBeUndefined();
  });
});
