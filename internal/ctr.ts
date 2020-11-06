import { symbols } from "./symbols";

export function getCtr<CtrT = any>(facet): CtrT {
  return facet[symbols.parentContainer];
}

export function setCtr(facet, ctr) {
  facet[symbols.parentContainer] = ctr;
}
