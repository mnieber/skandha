import { getCtrState } from '../internal/logging';
import { options as skandhaOptions } from '../internal/options';
import { getCtrAdmin, getFacetAdmin } from '../internal/utils';
import { setCtr } from './ctr';
import { facetClassName } from './facet';

// Registers members of ctr as facets in ctr. Each facet is registered by its class name.

export type OptionsT = {
  name: string;
  facets?: string[];
  ctrState?: Function;
};

export function registerCtr(ctr: any, options: OptionsT) {
  const ctrAdmin = getCtrAdmin(ctr);
  ctrAdmin.logName = options.name;
  ctrAdmin.facetMembers = ctrAdmin.facetMembers ?? [];
  ctrAdmin.facetByFacetClassName = ctrAdmin.facetByFacetClassName ?? {};
  ctrAdmin.ctrStateOverride = options.ctrState;

  (options.facets ?? Object.getOwnPropertyNames(ctr)).forEach((facetName) => {
    const facet = ctr[facetName];
    setCtr(facet, ctr);
    ctrAdmin.facetMembers.push(facetName);

    if (!facet.constructor.className) {
      console.error(
        `Facet ${facetName} of container ${ctrAdmin.logName} ` +
          `does not have a static className function`
      );
    }

    const className = facetClassName(facet.constructor);
    getFacetAdmin(facet).logName = `${ctrAdmin.logName}/${className}`;

    if (ctrAdmin.facetByFacetClassName[className] !== undefined) {
      console.error(
        `Two facets of same type ${className} in container ${ctrAdmin.logName}`
      );
    }
    ctrAdmin.facetByFacetClassName[className] = facet;
  });

  if (skandhaOptions.logging) {
    console.log(
      '%c     %s ctr initialized',
      'color: gray',
      ctrAdmin.logName,
      getCtrState(ctr)
    );
  }
}
