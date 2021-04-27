import { getCtrAdmin, getFacetAdmin } from "../internal/utils";

export function getc<CtrT = any>(facet): CtrT {
  return getFacetAdmin(facet).parentContainer;
}

export function setCtr(facet, ctr) {
  getFacetAdmin(facet).parentContainer = ctr;
}

export function getFacetMemberNames(ctr) {
  return getCtrAdmin(ctr).facetMembers ?? [];
}

export function addCleanUpFunctionToCtr(ctr, f) {
  const ctrAdmin = getCtrAdmin(ctr);
  ctrAdmin.cleanUpFunctions = ctrAdmin.cleanUpFunctions ?? [];
  ctrAdmin.cleanUpFunctions.push(f);
}

export function cleanUpCtr(ctr) {
  const ctrAdmin = getCtrAdmin(ctr);
  ctrAdmin.cleanUpFunctions = ctrAdmin.cleanUpFunctions ?? [];
  ctrAdmin.cleanUpFunctions.forEach((x) => x());
}
