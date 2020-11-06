import { symbols } from "../internal/symbols";
import { getOrCreate } from "../internal/utils";

export type ToAny<FuncT extends (...a: any) => any> = (
  ...a: Parameters<FuncT>
) => any;

type PartialMap<T> = { [k in keyof T]: any };

type ActionMap<FacetT extends PartialMap<FacetT>, K extends keyof FacetT> = {
  [label: string]: ToAny<FacetT[K]>[];
};

export class Callbacks<FuncT extends (...a: any) => any> {
  actions: ToAny<FuncT>[];
  self: any;
  args: Parameters<FuncT>;

  constructor(actions: ToAny<FuncT>[], self: any, args) {
    this.actions = actions;
    this.self = self;
    this.args = args;
  }

  exec(label: string, options: any) {
    const actions = this.actions[label];

    if (actions === undefined) {
      if (!options?.optional) {
        throw Error("Action not found: " + label);
      }
      return undefined;
    }

    var result = undefined;
    actions.forEach((f) => {
      result = f.bind(this.self)(...this.args);
    });
    return result;
  }

  enter() {
    return this.exec("enter", { optional: true });
  }

  exit() {
    return this.exec("exit", { optional: true });
  }
}

const _installActions = <
  FacetT extends { [k in keyof FacetT]: any },
  K extends keyof FacetT
>(
  facet: FacetT,
  operationMember: K,
  actionMap: ActionMap<FacetT, K>
) => {
  const actionMapByOperationName = getOrCreate(
    facet,
    symbols.actionMap,
    () => ({})
  );
  actionMapByOperationName[operationMember] = actionMap;
};

export const installActions = <FacetT extends PartialMap<FacetT>>(
  facet: FacetT,
  actionsByOperationMember: Partial<
    {
      [K in keyof FacetT]: ActionMap<FacetT, K>;
    }
  >
) => {
  Object.entries(actionsByOperationMember).forEach((x) => {
    _installActions(facet, x[0] as any, x[1] as any);
  });
};

export const getCallbacks = () => {
  const callbacks = stack[stack.length - 1];
  if (!callbacks || !callbacks.actions) {
    throw Error("No callbacks");
  }
  return callbacks;
};

export const exec = (label: string, options: any = undefined) => {
  return getCallbacks().exec(label, options);
};

const stack: any[] = [];

export const pushCallbacks = (x: any) => {
  stack.push(x);
};

export const popCallbacks = () => {
  stack.pop();
};
