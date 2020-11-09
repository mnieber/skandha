import { symbols } from "../internal/symbols";
import { getOrCreate } from "../internal/utils";

export type ToAny<FuncT extends (...a: any) => any> = (
  ...a: Parameters<FuncT>
) => any;

type PartialMap<T> = { [k in keyof T]: any };

type CallbackMap<FacetT extends PartialMap<FacetT>, K extends keyof FacetT> = {
  [label: string]: ToAny<FacetT[K]>[];
};

export class Callbacks<FuncT extends (...a: any) => any> {
  callbacks: ToAny<FuncT>[];
  self: any;
  args: Parameters<FuncT>;

  constructor(callbacks: ToAny<FuncT>[], self: any, args) {
    this.callbacks = callbacks;
    this.self = self;
    this.args = args;
  }

  exec(label: string, options: any) {
    this._exec(label + "_pre", { ...options, optional: true });
    const result = this._exec(label, options);
    this._exec(label + "_post", { ...options, optional: true });
    return result;
  }

  _exec(label: string, options: any) {
    const callbacks = this.callbacks[label];

    if (callbacks === undefined) {
      if (!options?.optional) {
        throw Error("Callback not found: " + label);
      }
      return undefined;
    }

    var result = undefined;
    callbacks.forEach((f) => {
      result = f.bind(this.self)(...this.args);
    });
    return result;
  }

  enter() {
    return this._exec("enter", { optional: true });
  }

  exit() {
    return this._exec("exit", { optional: true });
  }
}

const _setCallbacks = <
  FacetT extends { [k in keyof FacetT]: any },
  K extends keyof FacetT
>(
  facet: FacetT,
  operationMember: K,
  callbackMap: CallbackMap<FacetT, K>
) => {
  const callbackByOperationName = getOrCreate(
    facet,
    symbols.callbackMap,
    () => ({})
  );
  callbackByOperationName[operationMember] = callbackMap;
};

export const setCallbacks = <FacetT extends PartialMap<FacetT>>(
  facet: FacetT,
  callbacksByOperationMember: Partial<
    {
      [K in keyof FacetT]: CallbackMap<FacetT, K>;
    }
  >
) => {
  Object.entries(callbacksByOperationMember).forEach((x) => {
    _setCallbacks(facet, x[0] as any, x[1] as any);
  });
};

export const getCallbacks = () => {
  const callbacks = stack[stack.length - 1];
  if (!callbacks || !callbacks.callbacks) {
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
