import { setCtr } from "../internal/ctr";
import { getOrCreate } from "../internal/utils";
import { symbols } from "../internal/symbols";
import { facetClassName } from "../internal/logging";

export function facet(facetHost, facetMember, descriptor = undefined) {
  // Add the facetMember to the list of facetNembers
  const facetMembers = getOrCreate(
    facetHost.constructor,
    symbols.facetMembers,
    () => []
  );
  facetMembers.push(facetMember);

  return descriptor;
}

export function registerFacets(ctr) {
  const facetMembers = ctr.constructor[symbols.facetMembers];
  (facetMembers || []).forEach((member) => setCtr(ctr[member], ctr));

  const facetByFacetClassName = getOrCreate(
    ctr,
    symbols.facetByFacetClassName,
    () => ({})
  );
  (facetMembers || []).forEach((member) => {
    const facet = ctr[member];
    const className = facetClassName(facet.constructor);
    if (facetByFacetClassName[className] !== undefined) {
      console.error(
        `Two facets of same type ${className} in container ${ctr.constructor.name}`
      );
    }
    facetByFacetClassName[className] = facet;
  });
}

export function get(facetClass, ctr) {
  if (!facetClass.get) {
    console.error(`No get function in facet ${facetClass.name}`);
  }
  const facet = ctr[symbols.facetByFacetClassName][facetClass.name];

  if (!facet) {
    console.error(
      `No facet ${facetClass.name} in container ${ctr.constructor.name}`
    );
  }
  return facet;
}
