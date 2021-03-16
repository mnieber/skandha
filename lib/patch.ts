import { get } from "./facet";
import { facetName } from "../internal/logging";
import { getDataMemberNames } from "./data";
import { GetterT, ClassMemberT } from "..";

export function patchFacet(facet: any, members: any, options?: any) {
  const dataMemberNames = getDataMemberNames(facet);

  for (const prop in members) {
    if (options?.warnIfNotADataMember ?? true) {
      if (!dataMemberNames.includes(prop)) {
        console.error(
          `Patching a property ${prop} that wasn't decorated with ` +
            `@data, @input or @output in ${facetName(facet)}`
        );
      }
    }

    delete facet[prop];
    Object.defineProperty(facet, prop, {
      ...members[prop],
      enumerable: true,
      configurable: true,
    });
  }
}

export const mapData = (
  getter: GetterT,
  [toFacetClass, toMember]: ClassMemberT,
  transform?: Function
) => (ctr: any) => {
  const patch = {
    [toMember]: {
      get: () => {
        const context = {
          ctr,
          getter,
          toClassMember: [toFacetClass, toMember],
          data: getter(ctr),
        };
        return transform ? transform(context.data) : context.data;
      },
    },
  };
  patchFacet(get(toFacetClass, ctr), patch);
};

export const mapDatas = (
  getters: Array<GetterT>,
  [toFacetClass, toMember]: ClassMemberT,
  transform: Function
) => (ctr: any) => {
  const patch = {
    [toMember]: {
      get: () => {
        const context = {
          ctr,
          getters,
          toClassMember: [toFacetClass, toMember],
          datas: getters.map((getter) => getter(ctr)),
        };
        return transform(...context.datas);
      },
    },
  };
  patchFacet(get(toFacetClass, ctr), patch);
};
