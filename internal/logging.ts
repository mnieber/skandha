import { getLoggedMemberNames } from "../lib/data";
import { getCtrAdmin, getFacetAdmin } from "../internal/utils";
import { getc, getFacetMemberNames } from "../lib/ctr";
import { options } from "./options";

export function _defaultFacetLogName(facet: any) {
  const ctr = getc(facet);
  const prefix = ctr ? ctr.constructor.name + "/" : "";
  return prefix + facet.constructor.name;
}

export function facetLogName(facet: any) {
  return getFacetAdmin(facet).logName ?? _defaultFacetLogName(facet);
}

function camelToSnake(string) {
  return string
    .replace(/[\w]([A-Z])/g, function (m) {
      return m[0] + "_" + m[1];
    })
    .toLowerCase();
}

const opName = (operationMember) => camelToSnake(operationMember).toUpperCase();

export function log(facet, operationMember, args, start) {
  const ctr = getc(facet);
  const ctrAdmin = ctr ? getCtrAdmin(ctr) : undefined;
  const getCtrState = ctrAdmin?.ctrStateOverride ?? ctrState;
  const getState = ctr ? () => getCtrState(ctr) : () => facetState(facet);
  const operationName = opName(operationMember);
  const label = facetLogName(facet) + "." + operationName;

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
