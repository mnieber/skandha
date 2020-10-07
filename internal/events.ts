import { Signal } from "micro-signals";

import { getCtr } from "./ctr";
import { getOrCreate } from "./utils";
import { symbols } from "./symbols";

export const getSignal = (ctr) => {
  return getOrCreate(ctr, symbols.eventSignal, () => new Signal());
};

export const eventType = (facetClass, operationName) => {
  return facetClass.name + "." + operationName;
};

export const sendEvent = (facet, operationName, args, after) => {
  const ctr = getCtr(facet);
  getSignal(ctr).dispatch({
    type: eventType(facet.constructor, operationName),
    ctr,
    facet,
    args,
    after,
  });
};
