import { options } from "../internal/options";
import { symbols } from "../internal/symbols";
import { log } from "../internal/logging";
import { sendEvent } from "../internal/events";
import { StackFrame, pushStackFrame, popStackFrame } from "./StackFrame";

// Do some magic to ensure that the member function
// is bound to it's host.
// Copied from the bind-decorator npm package.
function wrapDescriptor(descriptor, operationMember) {
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

export function operation(operationHost, operationMember, descriptor) {
  const f = descriptor.value;
  if (typeof descriptor.value === "function") {
    descriptor.value = function (...args) {
      const facet = this;

      options.logging && log(facet, operationMember, args, true);
      sendEvent(facet, operationMember, args, false);

      const actions = (facet[symbols.actions] || {})[operationMember];
      const stackFrame = actions
        ? new StackFrame(actions, this, args)
        : undefined;
      pushStackFrame(stackFrame);

      const handlers = facet[symbols.operationHandlers];
      const returnValue =
        handlers && handlers[operationMember]
          ? handlers[operationMember](...args)
          : f.bind(this)(...args);

      if (stackFrame) {
        if (stackFrame.pointer === 0) {
          stackFrame.exec(operationMember);
        }
        stackFrame.finish();
      }

      popStackFrame();

      sendEvent(facet, operationMember, args, true);
      options.logging && log(facet, operationMember, args, false);

      return returnValue;
    };
  }
  return wrapDescriptor(descriptor, operationMember);
}

export function async_opn(operationHost, operationMember, descriptor) {
  const f = descriptor.value;
  if (typeof descriptor.value === "function") {
    descriptor.value = async function (...args) {
      const facet = this;

      options.logging && log(facet, operationMember, args, true);
      sendEvent(facet, operationMember, args, false);

      const handlers = facet[symbols.operationHandlers];
      const returnValue =
        handlers && handlers[operationMember]
          ? await handlers[operationMember](...args)
          : await f.bind(this)(...args);

      sendEvent(facet, operationMember, args, true);
      options.logging && log(facet, operationMember, args, false);

      return Promise.resolve(returnValue);
    };
  }
  return wrapDescriptor(descriptor, operationMember);
}
