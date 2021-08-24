import { ClassMemberT, ClassT, GetterT } from '..';
import { ctrState as getCtrState } from '../internal/logging';
import { options as skandhaOptions } from '../internal/options';
import {
  getCtrAdmin,
  getCtrClassAdmin,
  getFacetAdmin,
} from '../internal/utils';
import { setCtr } from './ctr';

// Registers facetMember as a facet in the facetHost class
export function facet(facetHost, facetMember, descriptor = undefined) {
  const ctrClassAdmin = getCtrClassAdmin(facetHost.constructor);
  ctrClassAdmin.facetMembers = ctrClassAdmin.facetMembers ?? [];
  ctrClassAdmin.facetMembers.push(facetMember);
  return descriptor;
}

export function facetClassName(facetClass: ClassT) {
  return facetClass.className ? facetClass.className() : facetClass.name;
}

// Registers members of ctr as facets in ctr. Each facet is registered by its class name.
export function registerFacets(
  ctr,
  options: { name?: string; members?: string[]; ctrState?: Function }
) {
  const ctrAdmin = getCtrAdmin(ctr);
  ctrAdmin.logName = options.name ?? ctr.constructor.name;
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
    facetAdmin.logName = `${ctrAdmin.logName}/${facetClassName(
      facet.constructor
    )}`;

    const className = facetClassName(facet.constructor);
    if (ctrAdmin.facetByFacetClassName[className] !== undefined) {
      console.error(
        `Two facets of same type ${className} in container ${ctrAdmin.logName}`
      );
    }
    ctrAdmin.facetByFacetClassName[className] = facet;

    if (skandhaOptions.logging) {
      console.log('%c     Ctr initialized', 'color: gray', getCtrState(ctr));
    }
  });
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

export function getm<T = any>(classMember: ClassMemberT): GetterT<T> {
  const f = (ctr: any) =>
    getf(classMember[0], classMember[2] ?? ctr)[classMember[1]];
  // Set some properties on f to ease debugging later
  f.facetClassName = facetClassName(classMember[0]);
  f.facetMemberName = classMember[1];
  return f;
}
