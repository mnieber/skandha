export { facetName, facetClassName, ctrState } from "./internal/logging";
export { getCtr, getFacetMemberNames } from "./lib/ctr";
export {
  input,
  output,
  data,
  log,
  getLoggedMemberNames,
  getDataMemberNames,
} from "./lib/data";
export { mapData, mapDatas, patchFacet } from "./lib/patch";
export { getOptions, setOptions } from "./internal/options";
export { operation, getOperationMemberNames } from "./lib/operation";
export { facet, registerFacets, get } from "./lib/facet";
export { installPolicies } from "./lib/install";

export type ClassT = any;
export type MemberNameT = string;
export type ClassMemberT = [ClassT, MemberNameT];
export type AdapterT = {
  [member: string]: ClassMemberT;
};
