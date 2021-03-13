import { options } from "../internal/options";
import { log } from "../internal/logging";
import { getFacetClassAdmin } from "../internal/utils";

function _operation(
  operationHost,
  operationMember,
  descriptor,
  punctualOptions
) {
  const f = descriptor.value;
  const facetClassAdmin = getFacetClassAdmin(operationHost.constructor);
  facetClassAdmin.operationMemberNames =
    facetClassAdmin.operationMemberNames ?? [];
  facetClassAdmin.operationMemberNames.push(operationMember);

  if (typeof descriptor.value === "function") {
    descriptor.value = !!punctualOptions.async
      ? async function (this: any, ...args) {
          const facet = this;
          const isLogging = options.logging && (punctualOptions.log ?? true);

          isLogging && log(facet, operationMember, args, true);
          const returnValue = await f.bind(this)(...args);
          isLogging && log(facet, operationMember, args, false);

          return Promise.resolve(returnValue);
        }
      : function (this: any, ...args) {
          const facet = this;
          const isLogging = options.logging && (punctualOptions.log ?? true);

          isLogging && log(facet, operationMember, args, true);
          const returnValue = f.bind(this)(...args);
          isLogging && log(facet, operationMember, args, false);

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
    const wrapped = (operationHost, operationMember, descriptor) => {
      return _operation(operationHost, operationMember, descriptor, args[0]);
    };
    return wrapped;
  }

  const [operationHost, operationMember, descriptor] = args;
  return _operation(operationHost, operationMember, descriptor, {});
}
