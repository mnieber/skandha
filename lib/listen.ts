import { eventType, getSignal } from "../internal/events";
import { getCtr } from "../internal/ctr";

interface OptionsT {
  after: string;
  onlyArgs: boolean;
}

export function listen(
  facet,
  operationMember,
  callback,
  options: OptionsT | undefined = undefined
) {
  const _type = eventType(facet.constructor, operationMember);
  const _after = options?.after === undefined ? true : options?.after;
  const _onlyArgs = options?.onlyArgs === undefined ? true : options?.onlyArgs;

  getSignal(getCtr(facet)).add((event) => {
    if (event.type === _type && event.after === _after) {
      if (_onlyArgs) {
        callback(...event.args);
      } else {
        callback(event);
      }
    }
  });
}
