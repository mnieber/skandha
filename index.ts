export { facetName, facetClassName, ctrState } from "./internal/logging";
export { getc, getFacetMemberNames } from "./lib/ctr";
export {
  input,
  output,
  data,
  log,
  getLoggedMemberNames,
  getDataMemberNames,
} from "./lib/data";
export {
  mapDataToFacet,
  mapDatasToFacet,
  patchFacet,
  mapDataToProp,
} from "./lib/patch";
export { getOptions, setOptions } from "./internal/options";
export { operation, getOperationMemberNames } from "./lib/operation";
export { facet, registerFacets, getm, getf } from "./lib/facet";
export { installPolicies } from "./lib/install";

export type ClassT = any;
export type MemberNameT = string;
export type ClassMemberT = [ClassT, MemberNameT];
export type GetterT<T = any> = (ctr: any) => T;
export type AdapterT = {
  [member: string]: ClassMemberT;
};
