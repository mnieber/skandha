import { getCtrClassAdmin, getFacetAdmin } from "../internal/utils";

export function getc<CtrT = any>(facet): CtrT {
  return getFacetAdmin(facet).parentContainer;
}

export function setCtr(facet, ctr) {
  getFacetAdmin(facet).parentContainer = ctr;
}

export function getFacetMemberNames(ctr) {
  return getCtrClassAdmin(ctr.constructor).facetMembers ?? [];
}
