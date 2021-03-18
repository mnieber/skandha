import { options } from "../internal/options";
import { log } from "../internal/logging";
import { getFacetClassAdmin } from "../internal/utils";

function _operation(target, propertyName, descriptor, punctualOptions) {
  const f = descriptor.value;
  const facetClassAdmin = getFacetClassAdmin(target.constructor);
  facetClassAdmin.operationMemberNames =
    facetClassAdmin.operationMemberNames ?? [];
  facetClassAdmin.operationMemberNames.push(propertyName);

  if (typeof descriptor.value === "function") {
    descriptor.value = !!punctualOptions.async
      ? async function (this: any, ...args) {
          const facet = this;
          const isLogging = options.logging && (punctualOptions.log ?? true);

          isLogging && log(facet, propertyName, args, true);
          const returnValue = await f.bind(this)(...args);
          isLogging && log(facet, propertyName, args, false);

          return Promise.resolve(returnValue);
        }
      : function (this: any, ...args) {
          const facet = this;
          const isLogging = options.logging && (punctualOptions.log ?? true);

          isLogging && log(facet, propertyName, args, true);
          const returnValue = f.bind(this)(...args);
          isLogging && log(facet, propertyName, args, false);

          return returnValue;
        };
  }

  return descriptor;
}

export function getOperationMemberNames(facet: any) {
  return getFacetClassAdmin(facet.constructor).operationMemberNames ?? [];
}

export function operation(...args) {
  if (args.length === 1) {
    const wrapped = (target, propertyName, descriptor) => {
      return _operation(target, propertyName, descriptor, args[0]);
    };
    return wrapped;
  }

  const [target, propertyName, descriptor] = args;
  return _operation(target, propertyName, descriptor, {});
}
