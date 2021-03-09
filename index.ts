export { facetName, facetClassName, ctrState } from "./internal/logging";
export { getCtr, getFacetMemberNames } from "./internal/ctr";
export {
  input,
  output,
  data,
  isDataMember,
  getDataMemberNames,
} from "./lib/data";
export { options } from "./internal/options";
export { operation, async_opn } from "./lib/operation";
export { facet, registerFacets, get } from "./lib/facet";
export { installPolicies } from "./lib/install";

export type ClassT = any;
export type MemberNameT = string;
export type ClassMemberT = [ClassT, MemberNameT];
export type AdapterT = {
  [member: string]: ClassMemberT;
};
