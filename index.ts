export { getCtrState } from './internal/logging';
export { getOptions, setOptions } from './internal/options';
export { createConnector } from './lib/Connector';
export { getc, getFacetMemberNames } from './lib/ctr';
export {
  data,
  getDataMemberNames,
  getLoggedMemberNames,
  input,
  log,
  output,
} from './lib/data';
export { facet, getf, registerFacets } from './lib/facet';
export { installPolicies } from './lib/install';
export { getOperationMemberNames, operation } from './lib/operation';
export { mapDataToProp } from './lib/patch';

export type ClassT = any;
