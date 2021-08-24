import { getf } from "./facet";
import { facetLogName } from "../internal/logging";
import { getDataMemberNames } from "./data";
import { GetterT, ClassMemberT } from "..";

export function mapDataToProp(facet: any, prop: string, getter: () => any) {
  delete facet[prop];
  Object.defineProperty(facet, prop, {
    get: getter,
    enumerable: true,
    configurable: true,
  });
}

export function patchFacet(facet: any, members: any, options?: any) {
  const dataMemberNames = getDataMemberNames(facet);

  for (const prop in members) {
    if (options?.warnIfNotADataMember ?? true) {
      if (!dataMemberNames.includes(prop)) {
        console.error(
          `Patching a property ${prop} that wasn't decorated with ` +
            `@data, @input or @output in ${facetLogName(facet)}`
        );
      }
    }

    try {
      delete facet[prop];
    } catch {
      console.error(
        `Could not delete property ${prop} from facet ${facetLogName(facet)}` +
          ". In case you are using mobx (or skandha-mobx), this can happen " +
          "when makeObservable (or makeCtrObservable) is called before " +
          "patching a property. Try calling these functions as late as " +
          "possible."
      );
    }

    Object.defineProperty(facet, prop, {
      ...members[prop],
      enumerable: true,
      configurable: true,
    });
  }
}

export const mapDataToFacet =
  (
    [toFacetClass, toMember, toCtr]: ClassMemberT,
    getter: GetterT,
    transform?: Function
  ) =>
  (ctr: any) => {
    const patch = {
      [toMember]: {
        get: () => {
          // This context variable is not necessary, it has redundant data and
          // could be inlined, but it makes debugging easier.
          const context = {
            ctr: toCtr ?? ctr,
            getter,
            toClassMember: [toFacetClass, toMember],
            data: getter(ctr),
          };
          return transform ? transform(context.data) : context.data;
        },
      },
    };
    patchFacet(getf(toFacetClass, toCtr ?? ctr), patch);
  };

export const mapDatasToFacet =
  (
    [toFacetClass, toMember, toCtr]: ClassMemberT,
    getters: Array<GetterT>,
    transform: Function
  ) =>
  (ctr: any) => {
    const patch = {
      [toMember]: {
        get: () => {
          const context = {
            ctr: toCtr ?? ctr,
            getters,
            toClassMember: [toFacetClass, toMember],
            datas: getters.map((getter) => getter(ctr)),
          };
          return transform(...context.datas);
        },
      },
    };
    patchFacet(getf(toFacetClass, toCtr ?? ctr), patch);
  };
