import { getOrCreate } from "facet/internal/utils";
import { options } from "facet/internal/options";
import { symbols, symbolName } from "facet/internal/symbols";

export function facetClassName(facetClass) {
  return symbolName(facetClass[symbols.symbol]);
}

export function facetName(facet) {
  return symbolName(facet.constructor[symbols.symbol]);
}

function camelToSnake(string) {
  return string
    .replace(/[\w]([A-Z])/g, function(m) {
      return m[0] + "_" + m[1];
    })
    .toLowerCase();
}

export const opName = operationMember =>
  camelToSnake(operationMember).toUpperCase();

export function log(ctr, operationMember, facet, args, start) {
  const ctrName = ctr.constructor.name;
  const operationName = opName(operationMember);
  const label = ctrName + "/" + facetName(facet) + "." + operationName;

  if (start) {
    console.group(label);
    console.log("%c           args: ", "color: gray", args);
    console.log("%c     state", "color: gray", containerState(ctr));
  } else {
    console.log("%c     next", "color: gray", containerState(ctr));
    console.groupEnd(label);
  }
}

export function containerState(ctr) {
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
