import { symbols } from './symbols';

// This class is a workaround for a problem that occurs when you
// try to store information using facet.constructor[symbols.admin] = ...
// For some reason, when you inherit from a Facet class then the original
// class and the enherited class share the same facet.constructor[symbols.admin]
// instance.
const facetClassAdminMap = new WeakMap();

export function getOrCreate(obj, key, fn) {
  if (!obj[key]) {
    obj[key] = fn();
  }
  return obj[key];
}

export const zip = (arr: any, ...arrs: any) => {
  return arr.map((val: any, i: any) =>
    arrs.reduce((a: any, arr: any) => [...a, arr[i]], [val])
  );
};

export function getCtrAdmin(ctr) {
  return getOrCreate(ctr, symbols.admin, () => ({}));
}

export function getFacetClassAdmin(facetClass) {
  if (!!facetClass.skandhaSymbol) {
    return getOrCreate(facetClassAdminMap, facetClass.skandhaSymbol, () => {
      // This function returns the initial value for the facetClassAdminMap.
      // If the facetClass has a superClass, then we return a copy of the
      // facetClassAdmin of the superClass.
      const superClass = Object.getPrototypeOf(facetClass);
      if (superClass !== Function.prototype && superClass !== null) {
        return {
          ...getFacetClassAdmin(superClass),
        };
      }
      return {};
    });
  }
  return getOrCreate(facetClass, symbols.admin, () => ({}));
}

export function getFacetAdmin(facet) {
  return getOrCreate(facet, symbols.admin, () => ({}));
}
