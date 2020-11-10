import { symbols } from "../internal/symbols";
import { getOrCreate } from "../internal/utils";

export type ToAny<FuncT extends (...a: any) => any> = (
  ...a: Parameters<FuncT>
) => any;

type FunctionMap<FuncT extends (...a: any) => any> = {
  [label: string]: ToAny<FuncT>[];
};

export class Callbacks<FuncT extends (...a: any) => any> {
  callbacks: FunctionMap<FuncT>;
  self: any;
  args: Parameters<FuncT>;
  queue: Array<Function> = [];

  constructor(callbacks: FunctionMap<FuncT>, self: any, args) {
    this.callbacks = callbacks;
    this.self = self;
    this.args = args;
  }

  _schedule(label, options: any) {
    const callbacks = this.callbacks[label];

    if (callbacks === undefined) {
      if (!options?.optional) {
        throw Error("Callback not found: " + label);
      }
      return undefined;
    }

    callbacks.forEach((f) => this.queue.push(f));
  }

  exec(label: string, options: any) {
    this._schedule(label + "_pre", { ...options, optional: true });
    this._schedule(label, options);
    const result = this._exec();
    this._schedule(label + "_post", { ...options, optional: true });
    return result;
  }

  _exec() {
    var result = undefined;
    this.queue.forEach((f) => {
      result = f.bind(this.self)(...this.args);
    });
    this.queue = [];
    return result;
  }

  enter() {
    this._schedule("enter", { optional: true });
  }

  exit() {
    this._schedule("exit", { optional: true });
    this._exec();
  }
}

type PartialMap<T> = { [k in keyof T]: any };

const _setCallbacks = <
  FacetT extends PartialMap<FacetT>,
  K extends keyof FacetT
>(
  facet: FacetT,
  operationMember: K,
  callbackMap: FunctionMap<FacetT[K]>
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
      [K in keyof FacetT]: FunctionMap<FacetT[K]>;
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
