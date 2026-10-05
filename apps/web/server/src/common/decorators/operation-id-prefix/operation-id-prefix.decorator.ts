import { ApiOperation } from '@nestjs/swagger';

export const OperationIdPrefix =
  (controllerName: string): ClassDecorator =>
  (target) => {
    for (const name of Object.getOwnPropertyNames(target.prototype)) {
      const descriptor = Object.getOwnPropertyDescriptor(target.prototype, name);

      if (name === 'constructor' || typeof descriptor?.value !== 'function') {
        continue;
      }

      ApiOperation({ operationId: `${controllerName}_${name}`, summary: undefined })(target.prototype, name, descriptor);
    }
  };
