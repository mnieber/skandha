import { symbols } from "./symbols";
import { getCtr } from "./ctr";
import { options } from "./options";

export function facetClassName(facetClass) {
  return facetClass.name;
}

export function facetName(facet) {
  const ctr = getCtr(facet);
  return ctr.constructor.name + "/" + facet.constructor.name;
}

function camelToSnake(string) {
  return string
    .replace(/[\w]([A-Z])/g, function (m) {
      return m[0] + "_" + m[1];
    })
    .toLowerCase();
}

export const opName = (operationMember) =>
  camelToSnake(operationMember).toUpperCase();

export function log(facet, operationMember, args, start) {
  const ctr = getCtr(facet);
  const operationName = opName(operationMember);
  const label = facetName(facet) + "." + operationName;

  if (start) {
    console.group(label);
    console.log("%c           args: ", "color: gray", args);
    console.log("%c     state", "color: gray", ctrState(ctr));
  } else {
    console.log("%c     next", "color: gray", ctrState(ctr));
    // @ts-ignore
    console.groupEnd(label);
  }
}

export function ctrState(ctr) {
  if (ctr) {
    return ctr.constructor[symbols.facetMembers].reduce((acc, facetMember) => {
      const facet = ctr[facetMember];
      const facetClass = facet.constructor;
      const facetDatas = facetClass[symbols.dataMembers];
      const facetState = facetDatas
        ? Object.keys(facetDatas).reduce((acc, dataMember) => {
            try {
              const data = options.formatObject(facet[dataMember]);
              return {
                ...acc,
                [dataMember]: data,
              };
            } catch {
              return acc;
            }
          }, {})
        : {};

      return { ...acc, [facetMember]: facetState };
    }, {});
  }
}
