import { options } from "../internal/options";
import { log } from "../internal/logging";

export function operation(operationHost, operationMember, descriptor) {
  const f = descriptor.value;

  if (typeof descriptor.value === "function") {
    descriptor.value = function (...args) {
      const facet = this;

      options.logging && log(facet, operationMember, args, true);
      const returnValue = f.bind(this)(...args);
      options.logging && log(facet, operationMember, args, false);

      return returnValue;
    };
  }

  return descriptor;
}

export function async_opn(operationHost, operationMember, descriptor) {
  const f = descriptor.value;
  if (typeof descriptor.value === "function") {
    descriptor.value = async function (...args) {
      const facet = this;

      options.logging && log(facet, operationMember, args, true);
      const returnValue = await f.bind(this)(...args);
      options.logging && log(facet, operationMember, args, false);

      return Promise.resolve(returnValue);
    };
  }
  return descriptor;
}
