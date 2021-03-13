import { getFacetMemberNames, setCtr } from "./ctr";
import { getCtrClassAdmin, getCtrAdmin } from "../internal/utils";
import { facetClassName } from "../internal/logging";

export function facet(facetHost, facetMember, descriptor = undefined) {
  const ctrClassAdmin = getCtrClassAdmin(facetHost.constructor);
  ctrClassAdmin.facetMembers = ctrClassAdmin.facetMembers ?? [];
  ctrClassAdmin.facetMembers.push(facetMember);
  return descriptor;
}

export function registerFacets(ctr) {
  const ctrAdmin = getCtrAdmin(ctr);

  ctrAdmin.facetByFacetClassName = ctrAdmin.facetByFacetClassName ?? {};
  getFacetMemberNames(ctr).forEach((member) => {
    const facet = ctr[member];
    setCtr(facet, ctr);

    const className = facetClassName(facet.constructor);
    if (ctrAdmin.facetByFacetClassName[className] !== undefined) {
      console.error(
        `Two facets of same type ${className} in container ${ctr.constructor.name}`
      );
    }
    ctrAdmin.facetByFacetClassName[className] = facet;
  });
}

export function get(facetClass, ctr) {
  const facet = getCtrAdmin(ctr).facetByFacetClassName?.[facetClass.name];
  if (!facet) {
    console.error(
      `No facet ${facetClass.name} in container ${ctr.constructor.name}`
    );
  }
  return facet;
}
