import { setCtr } from "./ctr";
import {
  getCtrClassAdmin,
  getCtrAdmin,
  getFacetAdmin,
} from "../internal/utils";
import { ClassT, GetterT, ClassMemberT } from "..";

export function facet(facetHost, facetMember, descriptor = undefined) {
  const ctrClassAdmin = getCtrClassAdmin(facetHost.constructor);
  ctrClassAdmin.facetMembers = ctrClassAdmin.facetMembers ?? [];
  ctrClassAdmin.facetMembers.push(facetMember);
  return descriptor;
}

export function registerFacets(
  ctr,
  options: { name?: string; members?: string[]; ctrState?: Function }
) {
  const ctrName = options.name ?? ctr.constructor.name;

  const ctrAdmin = getCtrAdmin(ctr);
  ctrAdmin.facetMembers = ctrAdmin.facetMembers ?? [];
  ctrAdmin.facetByFacetClassName = ctrAdmin.facetByFacetClassName ?? {};
  ctrAdmin.ctrStateOverride = options.ctrState;

  (
    options.members ??
    getCtrClassAdmin(ctr.constructor).facetMembers ??
    Object.getOwnPropertyNames(ctr)
  ).forEach((member) => {
    ctrAdmin.facetMembers.push(member);

    const facet = ctr[member];
    setCtr(facet, ctr);

    const facetAdmin = getFacetAdmin(facet);
    facetAdmin.logName = `${ctrName}/${facet.constructor.name}`;

    const className = facet.constructor.name;
    if (ctrAdmin.facetByFacetClassName[className] !== undefined) {
      console.error(
        `Two facets of same type ${className} in container ${options.name}`
      );
    }
    ctrAdmin.facetByFacetClassName[className] = facet;
  });
}

export function getf(facetClass: ClassT, ctr?: any) {
  if (!ctr) return (ctr: any) => getf(facetClass, ctr);

  const facet = getCtrAdmin(ctr).facetByFacetClassName?.[facetClass.name];
  if (!facet) {
    console.error(
      `No facet ${facetClass.name} in container ${ctr.constructor.name}`
    );
  }
  return facet;
}

export function getm<T = any>(classMember: ClassMemberT): GetterT<T> {
  const f = (ctr: any) =>
    getf(classMember[0], classMember[2] ?? ctr)[classMember[1]];
  // Set some properties on f to easy debugging later
  f.facetClassName = classMember[0].name;
  f.facetMemberName = classMember[1];
  return f;
}
