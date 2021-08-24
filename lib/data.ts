import { getFacetClassAdmin } from '../internal/utils';

export function log(dataHost, dataMember, descriptor: any = undefined) {
  const facetClassAdmin = getFacetClassAdmin(dataHost.constructor);
  facetClassAdmin.loggedMembers = facetClassAdmin.loggedMembers ?? {};
  facetClassAdmin.loggedMembers[dataMember] = true;
  return descriptor;
}

export function data(dataHost, dataMember, descriptor: any = undefined) {
  const facetClassAdmin = getFacetClassAdmin(dataHost.constructor);
  facetClassAdmin.dataMembers = facetClassAdmin.dataMembers ?? {};
  facetClassAdmin.dataMembers[dataMember] = true;
  return log(dataHost, dataMember, descriptor);
}

export function getLoggedMemberNames(facet) {
  return Object.keys(getFacetClassAdmin(facet.constructor).loggedMembers ?? {});
}

export function getDataMemberNames(facet) {
  return Object.keys(getFacetClassAdmin(facet.constructor).dataMembers ?? {});
}

export const input = data;
export const output = data;
