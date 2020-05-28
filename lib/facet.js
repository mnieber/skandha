import { getOrCreate } from "facet/internal/utils";
import { symbols } from "facet/internal/symbols";

export function facet(facetClass) {
  const facetSymbol = facetClass[symbols.symbol];

  return function(facetHost, facetMember, descriptor) {
    // Register the facet under the facet symbol
    if (facetHost[facetSymbol]) {
      console.warn(`Overwriting facet ${facetMember} on ${facetHost}`);
    }
    facetHost[facetSymbol] = facetMember;

    // Add the facetMember to the list of facetNembers
    const facetMembers = getOrCreate(
      facetHost.constructor,
      symbols.facetMembers,
      () => []
    );
    facetMembers.push(facetMember);

    return descriptor;
  };
}

export function facetClass(facetClass) {
  // Add a symbol member
  const symbol = Symbol(facetClass.name);
  facetClass[symbols.symbol] = symbol;

  // Add a get member function
  facetClass.get = ctr => {
    const facetMember = ctr[symbol];
    if (!facetMember) {
      console.error(`No interface ${facetClass.name} in container`);
    }
    return ctr[facetMember];
  };
  return facetClass;
}

export function registerFacets(ctr) {
  const facetMembers = ctr.constructor[symbols.facetMembers];
  (facetMembers || []).forEach(
    member => (ctr[member][symbols.parentContainer] = ctr)
  );
}
