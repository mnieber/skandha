import { getLoggedMemberNames } from "../lib/data";
import { getCtr, getFacetMemberNames } from "../lib/ctr";
import { options } from "./options";

export function facetClassName(facetClass) {
  return facetClass.name;
}

export function facetName(facet) {
  const ctr = getCtr(facet);
  const prefix = ctr ? ctr.constructor.name + "/" : "";
  return prefix + facet.constructor.name;
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
  const getState = ctr ? () => ctrState(ctr) : () => facetState(facet);
  const operationName = opName(operationMember);
  const label = facetName(facet) + "." + operationName;

  if (start) {
    console.group(label);
    console.log("%c           args: ", "color: gray", args);
    console.log("%c     state", "color: gray", getState());
  } else {
    console.log("%c     next", "color: gray", getState());
    // @ts-ignore
    console.groupEnd(label);
  }
}

export function facetState(facet) {
  return getLoggedMemberNames(facet).reduce((acc, loggedMember) => {
    try {
      const data = options.formatObject(facet[loggedMember]);
      return {
        ...acc,
        [loggedMember]: data,
      };
    } catch {
      return acc;
    }
  }, {});
}

export function ctrState(ctr) {
  if (ctr) {
    return getFacetMemberNames(ctr).reduce((acc, facetMemberName) => {
      const facet = ctr[facetMemberName];
      return { ...acc, [facetMemberName]: facetState(facet) };
    }, {});
  }
}
