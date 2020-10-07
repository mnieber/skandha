import { facetName } from "../internal/logging";
import { symbols } from "../internal/symbols";
import { getOrCreate } from "../internal/utils";

export function handle(operationHost, operationMember, callback) {
  if (!operationHost[operationMember]) {
    console.error(`No member function ${operationMember} in ${operationHost}`);
  }
  const handlers = getOrCreate(
    operationHost,
    symbols.operationHandlers,
    () => ({})
  );
  if (operationMember in handlers) {
    console.error(
      `Operation ${operationMember} in facet ${facetName(
        operationHost
      )} already has a handler`
    );
  }
  handlers[operationMember] = callback;
}
