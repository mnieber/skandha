import { options } from "facet/internal/options";
import { symbols } from "facet/internal/symbols";
import { log } from "facet/internal/logging";

export function operation(operationHost, operationMember, descriptor) {
  const f = descriptor.value;
  if (typeof descriptor.value === "function") {
    descriptor.value = async function(...args) {
      const facet = this;
      let returnValue = undefined;

      f.bind(this)(...args);

      if (options.logging) {
        const ctr = facet[symbols.parentContainer];
        log(ctr, operationMember, facet, args, true);
      }

      const signalsBefore = facet[symbols.operationSignalsBefore];
      if (signalsBefore && signalsBefore[operationMember]) {
        signalsBefore[operationMember].dispatch(args);
      }

      const handlers = facet[symbols.operationHandlers];
      if (handlers && handlers[operationMember]) {
        returnValue = await handlers[operationMember](...args);
      }

      const signalsAfter = facet[symbols.operationSignalsAfter];
      if (signalsAfter && signalsAfter[operationMember]) {
        signalsAfter[operationMember].dispatch(args);
      }

      if (options.logging) {
        const ctr = facet[symbols.parentContainer];
        log(ctr, operationMember, facet, args, false);
      }

      return returnValue;
    };
  }

  // Do some magic to ensure that the member function
  // is bound to it's host.
  // Copied from the bind-decorator npm package.
  return {
    configurable: true,
    get() {
      const bound = descriptor.value.bind(this);
      Object.defineProperty(this, operationMember, {
        value: bound,
        configurable: true,
        writable: true,
      });
      return bound;
    },
  };
}
