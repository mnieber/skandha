import { ClassT } from '..';
import { getCtrAdmin } from '../internal/utils';

export function facetClassName(facetClass: ClassT) {
  return facetClass.className ? facetClass.className() : facetClass.name;
}

export function getf(facetClass: ClassT | string, ctr?: any) {
  if (!ctr) return (ctr: any) => getf(facetClass, ctr);

  const facet =
    typeof facetClass === 'string'
      ? (ctr as any)[facetClass]
      : getCtrAdmin(ctr).facetByFacetClassName?.[facetClassName(facetClass)];

  if (!facet) {
    const facetName =
      facetClass === 'string' ? facetClass : facetClassName(facetClass);
    console.error(
      `No facet ${facetName} in container ${getCtrAdmin(ctr).logName}`
    );
  }
  return facet;
}
