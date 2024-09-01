import { log } from '../internal/logging';
import { options } from '../internal/options';
import { OperationOptions } from './operation';

export function asyncOp(originalMethod, context) {
  const methodName = String(context.name);

  return function (this: any, ...args) {
    options.logging && log(this, methodName, args, true);
    const result = originalMethod.apply(this, args);
    return (result as any).then((returnValue) => {
      options.logging && log(this, methodName, args, false);
      return returnValue;
    });
  } as any;
}

export function asyncOpExt(punctualOptions: OperationOptions) {
  return function (originalMethod, context) {
    const methodName = String(context.name);

    return function (this: any, ...args) {
      const isLogging = options.logging && punctualOptions.log;

      isLogging && log(this, methodName, args, true);
      const result = originalMethod.apply(this, args);
      return (result as any).then((returnValue) => {
        isLogging && log(this, methodName, args, false);
        return returnValue;
      });
    } as any;
  };
}
