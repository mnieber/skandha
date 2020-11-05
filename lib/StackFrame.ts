import { symbols } from "../internal/symbols";
import { getOrCreate } from "../internal/utils";

export type LabelledFuncT<FuncT extends (...a: any) => any> = {
  label: string;
  func: (...a: Parameters<FuncT>) => any;
};

export type UnlabelledFuncT<FuncT extends (...a: any) => any> = (
  ...a: Parameters<FuncT>
) => any;

type PartialMap<T> = { [k in keyof T]: any };

type ActionArray<
  FacetT extends PartialMap<FacetT>,
  K extends keyof FacetT
> = Array<UnlabelledFuncT<FacetT[K]> | LabelledFuncT<FacetT[K]>>;

export const lbl = <FuncT extends (...a: any) => any>(
  label: string,
  func: FuncT
): LabelledFuncT<FuncT> => {
  return {
    label,
    func,
  };
};

export class StackFrame<FuncT extends (...a: any) => any> {
  actions: LabelledFuncT<FuncT>[];
  pointer: number = 0;
  self: any;
  args: Parameters<FuncT>;

  constructor(actions: LabelledFuncT<FuncT>[], self: any, args) {
    this.actions = actions;
    this.self = self;
    this.args = args;
  }

  matches = (label: string) => (x: LabelledFuncT<FuncT>) => x.label === label;

  exec(label: string, options: any) {
    const isMatch = this.matches(label);
    const offset = this.actions.slice(this.pointer).findIndex(isMatch);

    if (offset === -1) {
      if (!options?.optional) {
        throw Error("Action not found: " + label);
      }
      return undefined;
    }

    // since the label may be repeated, advance the pointer
    // to the last consecutive instance of the label
    var targetPointer = this.pointer + offset;
    while (
      targetPointer + 1 < this.actions.length &&
      isMatch(this.actions[targetPointer + 1])
    ) {
      targetPointer += 1;
    }

    return this._runTo(targetPointer);
  }

  begin() {
    return this.exec("BEGIN", { optional: true });
  }

  finish() {
    return this._runTo(this.actions.length - 1);
  }

  _runTo(targetPointer: number) {
    var result = undefined;
    while (this.pointer <= targetPointer) {
      const func = this.actions[this.pointer].func;
      result = func.bind(this.self)(...this.args);
      this.pointer += 1;
    }
    return result;
  }
}

const _installActions = <
  FacetT extends { [k in keyof FacetT]: any },
  K extends keyof FacetT
>(
  facet: FacetT,
  operationMember: K,
  actionFunctions: ActionArray<FacetT, K>
) => {
  const actions = actionFunctions.map((x) => {
    return "label" in x && "func" in x ? x : lbl("", x);
  });

  const actionsByOperationName = getOrCreate(
    facet,
    symbols.actions,
    () => ({})
  );
  actionsByOperationName[operationMember] = actions;
};

export const installActions = <FacetT extends PartialMap<FacetT>>(
  facet: FacetT,
  actionsByOperationMember: Partial<
    {
      [K in keyof FacetT]: ActionArray<FacetT, K>;
    }
  >
) => {
  Object.entries(actionsByOperationMember).forEach((x) => {
    _installActions(facet, x[0] as any, x[1] as any);
  });
};

export const exec = (label: string, options: any = undefined) => {
  const stackFrame = stack[stack.length - 1];
  if (!stackFrame || !stackFrame.actions) {
    throw Error("No stackframe");
  }
  return stackFrame.exec(label, options);
};

const stack: any[] = [];

export const pushStackFrame = (x: any) => {
  stack.push(x);
};

export const popStackFrame = () => {
  stack.pop();
};
