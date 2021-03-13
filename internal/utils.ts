import { symbols } from "./symbols";

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

export function getCtrClassAdmin(ctrClass) {
  return getOrCreate(ctrClass, symbols.admin, () => ({}));
}

export function getCtrAdmin(ctr) {
  return getOrCreate(ctr, symbols.admin, () => ({}));
}

export function getFacetClassAdmin(facetClass) {
  return getOrCreate(facetClass, symbols.admin, () => ({}));
}

export function getFacetAdmin(facet) {
  return getOrCreate(facet, symbols.admin, () => ({}));
}
