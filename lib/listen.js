import { Signal } from "micro-signals";
import { getOrCreate } from "facet/internal/utils";
import { symbols } from "facet/internal/symbols";

export function listen(operationHost, operationMember, callback, after = true) {
  if (!operationHost[operationMember]) {
    console.error(`No member function ${operationMember} in ${operationHost}`);
  }
  const signals = getOrCreate(
    operationHost,
    after ? symbols.operationSignalsAfter : symbols.operationSignalsBefore,
    () => ({})
  );
  const signal = getOrCreate(signals, operationMember, () => new Signal());
  signal.add(args => callback(...args));
}
