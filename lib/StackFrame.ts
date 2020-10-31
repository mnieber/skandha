import { symbols } from "../internal/symbols";
import { getOrCreate } from "../internal/utils";

export type LabelledFuncT<FunctT extends Function> = {
  label: string;
  func: FunctT;
};

type PartialMap<T> = { [k in keyof T]: any };

type ActionArray<
  FacetT extends PartialMap<FacetT>,
  K extends keyof FacetT
> = Array<FacetT[K] | LabelledFuncT<FacetT[K]>>;

export const lbl = <FuncT extends Function>(
  label: string,
  func: FuncT
): LabelledFuncT<FuncT> => {
  return {
    label,
    func,
  };
};

export class StackFrame<FunctT extends Function> {
  actions: LabelledFuncT<FunctT>[];
  pointer: number = 0;
  self: any;
  args: any[];

  constructor(actions: LabelledFuncT<FunctT>[], self: any, args) {
    this.actions = actions;
    this.self = self;
    this.args = args;
  }

  matches = (label: string) => (x: LabelledFuncT<FunctT>) => x.label === label;

  exec(label: string) {
    const offset = this.actions
      .slice(this.pointer)
      .findIndex(this.matches(label));

    if (offset === -1) {
      throw Error("Action not found: " + label);
    }

    this._runTo(this.pointer + offset);
  }

  finish() {
    this._runTo(this.actions.length - 1);
  }

  _runTo(targetPointer: number) {
    while (this.pointer <= targetPointer) {
      const func = this.actions[this.pointer].func;
      func.bind(this.self)(...this.args);
      this.pointer += 1;
    }
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
    return "label" in x && "func" in x
      ? x
      : lbl(x[symbols.actionLabel] ?? "", x);
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

export const exec = (label: string) => {
  const stackFrame = stack[stack.length - 1];
  if (!stackFrame || !stackFrame.actions) {
    throw Error("No stackframe");
  }
  stackFrame.exec(label);
};

const stack: any[] = [];

export const pushStackFrame = (x: any) => {
  stack.push(x);
};

export const popStackFrame = () => {
  stack.pop();
};

export const opAction = (label: string) => <FuncT>(f: FuncT) => {
  f[symbols.actionLabel] = label;
  return f;
};
