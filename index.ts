export { ctrState } from './internal/logging';
export { getOptions, setOptions } from './internal/options';
export { getc, getFacetMemberNames } from './lib/ctr';
export {
  data,
  getDataMemberNames,
  getLoggedMemberNames,
  input,
  log,
  output,
} from './lib/data';
export { facet, getf, getm, registerFacets } from './lib/facet';
export { installPolicies } from './lib/install';
export { getOperationMemberNames, operation } from './lib/operation';
export {
  mapDatasToFacet,
  mapDataToFacet,
  mapDataToProp,
  patchFacet,
} from './lib/patch';

export type ClassT = any;
export type MemberNameT = string;
export type ClassMemberT = [ClassT, MemberNameT, any?];
export type GetterT<T = any> = (ctr: any) => T;
