import { getFacetClassAdmin } from '../internal/utils';

export function log(target, context): void {
  const facetClassAdmin = getFacetClassAdmin(target.constructor);
  facetClassAdmin.loggedMembers = facetClassAdmin.loggedMembers ?? {};
  facetClassAdmin.loggedMembers[context.name] = true;
}

export function data(target, context): void {
  const facetClassAdmin = getFacetClassAdmin(target.constructor);
  facetClassAdmin.dataMembers = facetClassAdmin.dataMembers ?? {};
  facetClassAdmin.dataMembers[context.name] = true;

  // Apply log decorator as well
  log(target, context);
}

export function getLoggedMemberNames(facet) {
  return Object.keys(getFacetClassAdmin(facet.constructor).loggedMembers ?? {});
}

export function getDataMemberNames(facet) {
  return Object.keys(getFacetClassAdmin(facet.constructor).dataMembers ?? {});
}

export const input = data;
export const output = data;
