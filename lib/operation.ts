import { log } from '../internal/logging';
import { options } from '../internal/options';
import { getFacetClassAdmin } from '../internal/utils';

export type OperationOptions = {
  async?: boolean;
  log?: boolean;
};

export function operation(originalMethod, context) {
  const methodName = String(context.name);

  return function (this: any, ...args) {
    options.logging && log(this, methodName, args, true);
    const result = originalMethod.apply(this, args);
    options.logging && log(this, methodName, args, false);
    return result;
  } as any;
}

export function operationExt(punctualOptions: OperationOptions) {
  return function (originalMethod, context) {
    const methodName = String(context.name);

    return function (this: any, ...args) {
      const isLogging = options.logging && punctualOptions.log;

      isLogging && log(this, methodName, args, true);
      const result = originalMethod.apply(this, args);
      isLogging && log(this, methodName, args, false);
      return result;
    };
  } as any;
}

export function getOperationMemberNames(facet: any) {
  return getFacetClassAdmin(facet.constructor).operationMemberNames ?? [];
}
