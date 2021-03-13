import { get } from "./facet";
import { facetName } from "../internal/logging";
import { getDataMemberNames } from "./data";
import { ClassMemberT } from "..";
import { zip } from "../internal/utils";

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

function createPatch(
  patchedFacetClass: any,
  otherFacetClasses: Array<any>,
  callback: (...x: any) => any
) {
  return (ctr: any) => {
    const otherFacets = otherFacetClasses.map((facetClass) =>
      facetClass ? get(facetClass, ctr) : ctr
    );
    // @ts-ignore
    const patch = callback.bind(this)(ctr, ...otherFacets);

    if (patch && patchedFacetClass) {
      patchFacet(get(patchedFacetClass, ctr), patch);
    }
  };
}

function _check(member, facet) {
  if (member !== "" && !(member in facet)) {
    console.error(`No member ${member} in ${facetName(facet)}`);
  }
}

export const mapData = (
  [fromFacetClass, fromMember]: ClassMemberT,
  [toFacetClass, toMember]: ClassMemberT,
  transform?: Function
) => {
  return createPatch(
    toFacetClass,
    [fromFacetClass],
    (ctr: any, fromFacet: any) => ({
      [toMember]: {
        get: () => {
          _check(fromMember, fromFacet);
          const context = {
            ctr,
            fromClassMember: [fromFacetClass, fromMember],
            toClassMember: [toFacetClass, toMember],
            data: fromMember === "" ? fromFacet : fromFacet[fromMember],
          };
          return transform ? transform(context.data) : context.data;
        },
      },
    })
  );
};

export const mapDatas = (
  sources: Array<ClassMemberT>,
  [toFacetClass, toMember]: ClassMemberT,
  transform: Function
) => {
  const fromFacetClasses = sources.map((x) => x[0]);
  const fromMembers = sources.map((x) => x[1]);

  return createPatch(
    toFacetClass,
    fromFacetClasses,
    (ctr: any, ...fromFacets: Array<any>) => ({
      [toMember]: {
        get: () => {
          const datas = zip(fromFacets, fromMembers).map(
            ([facet, member]: any) => {
              _check(member, facet);
              return member === "" ? facet : facet[member];
            }
          );
          const context = {
            ctr,
            fromClassMembers: sources,
            toClassMember: [toFacetClass, toMember],
            datas: datas,
          };
          return transform(...context.datas);
        },
      },
    })
  );
};
