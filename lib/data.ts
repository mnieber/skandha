import { getOrCreate } from "../internal/utils";
import { symbols } from "../internal/symbols";

export function data(dataHost, dataMember, descriptor: any = undefined) {
  const facetClass = dataHost.constructor;
  const datas = getOrCreate(facetClass, symbols.dataMembers, () => ({}));
  datas[dataMember] = true;
  return descriptor;
}

export function isDataMember(facetClass, prop) {
  const facetDatas = facetClass[symbols.dataMembers];
  return facetDatas && facetDatas[prop];
}

export function getDataMemberNames(facetClass) {
  return Object.keys(facetClass[symbols.dataMembers] || {});
}

export const input = data;
export const output = data;
