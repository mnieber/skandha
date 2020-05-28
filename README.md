# Facet

## Rationale

Despite having a lot of good libraries, programmers are still reimplementing the same solutions over and over. The reason is that not every solution can be captured in a library. When there are cross-cutting concerns (aka aspects, as in aspect oriented programming), then out-of-the-box solutions often do not fit well enough. This is especially true when the programmer is asked to work with data-structures that are to tightly coupled to a particular framework (for example: Qt).

Facet proposes an alternative solution (somewhat inspired by Erlang, though I don't too much about that language) that aims to let the programmer re-use existing logic, without re-using existing data structures. It let's the programmer map their custom data-structures on a set of minimal interfaces (called Facets) and set up policies that enforce particular behaviours between these interfaces. When these interfaces are truly minimal, they can be generic, which leads to better code reuse.

# Example code:

See https://github.com/mnieber/lindyscience/blob/master/website/screens/moves_container/moves_container.jsx for an example that uses many Facets to implement a rich set of behaviours. Note that all these behaviours come from re-usable code. The `MovesContainer` class itself is implementing almost none of it.

# Explanation

Please skip the Details sections if you just want to get a quick overview.

## Container

0. A Container is a set of related data, e.g. a Todo list and its Todos

## Facet

1.0 A Facet is an interface on a Container that focusses on a single aspect, e.g. Selection

### Details

1.1 A Facet class is declared with a decorator:

```
    @facetClass
    class Selection {
      static get: GetFacet<Selection>;
    }
```

1.2 A facet is registered on a container with a decorator:

```
    class TodosCtr {
      @facet(Selection) selection: Selection;
    }
```

1.3 Facets can be accessed through their class

```
    selection = Selection.get(ctr);
```

1.4 Facets make clients agnostic of the container.

```
    const selectionSize = (ctr: any) => Selection.get(ctr).items.length;
```

1.5 Preferably, Facets have little or no code. Instead of adding a constructor, it's better to add a builder function. This leaves the Facet open to various implementations.

```
    @facetClass
    export class Selection {
      @input selectableIds: Array<any>;
      @observable ids: Array<any> = [];
      @observable anchorId: any;
      @output items: Array<any>;

      @operation selectItem({ itemId, isShift, isCtrl }) {}

      static get: GetFacet<Selection>;
    }
```

1.6 Note that in the example above, the Facet doesn't decide how the `selection.items` slot is filled, only that clients can expect to have an array of items (corresponding to `selection.ids`).

1.7 For convenience, it's good to provide a default Policy for filling slots. The following Policy fills the `selection.items` slot by looking up each id in a map that is provided by some other Facet. Note that `mapData` takes three arguments:

- a list of fields to look up. In this case: `Collection.get(ctr)[itemById]` and `Selection.get(ctr)["ids"]`
- the output slot to fill. In this case: `Selection.get(ctr)["items"]`
- a transformation function. In this case: a function that looks up ids in `itemById`.

```
  export const selectionActsOnItems = ([Collection, itemById]) =>
    mapDatas(
      [[Collection, itemById], [Selection, "ids"]],
      [Selection, "items"],
      (itemById, ids) => lookUp(ids, itemById)
    );
```

## Data management

2.0 Facets usually contain data.

```
    @facetClass
    class Selection {
      @observable ids: Array<any> = [];
      @input selectableIds: Array<any>;
      @output items: Array<any>;
      ...
}
```

Fields marked with `@input` and `@output` are slots to be filled by policies. Fields marked with `@observable` are managed by the Facet directly.

2.1 The Container class can set up data mappings between its Facets. For example, we can fill the slot `ctr.selection.selectableIds` using `getIds(ctr.inputs.todos)` as follows:

```
    class TodosCtr {
      ...
      _createPolicies() {
        const policy = mapData([Inputs, "todos"], [Selection, "selectableIds"], getIds);
        policy(this);
      }
    }
}
```

Note that `mapData` doesn't know about `TodosCtr`, but it can still access its Facets, see 1.3 and 1.4.

### Details

2.1.1 Internally, `mapData` uses `MobX.extendObservable` to create a `@computed` property on the target instance that returns data from the source instance. In the above example, the result of calling `mapData` is equivalent to calling `MobX.extendObservable(ctr.selection, { get selectableIds() { return getIds(ctr.inputs.todos); }}`.

2.1.2 Sometimes, using `MobX.extendObservable` creates a cycle the MobX will complain about. In that case, one could use `relayData`, which is based on `MobX.reaction`.

## Operations

3.0 Facets can declare operations. These are signals that can be handled by the Facet itself or by a policy.

```
    @facetClass
    class Selection {
      @operation selectItem({ itemId, isShift, isCtrl }) {}
      ...
}
```

3.1 Clients can listen to an operation.

```
    function handleSelectItem(ctr) {
      listen(Selection.get(ctr), 'selectItem', ({ itemId }) => {
        const selection = Selection.get(ctr);
        // add itemId to selection.ids
      })
}
```

## External dependencies

### Details

4.0 The builder for a Facet may take external dependencies. For example, the Selection facet may depend on an external function to persist the selection:

```
    @facetClass
    class Selection {
      @input persistIds: Array<any> => any;
      ...
    }

    const initSelection = (self: Selection, {persistIds}) => {
      self.persistIds = persistIds;
    }

    function handleSelectItem(ctr) {
      listen(Selection.get(ctr), 'selectItem', ({ itemId }) => {
        const selection = Selection.get(ctr);
        ...
        // Call the external persistIds function
        selection.persistIds(selection.ids);
      })
```

## Policies

5.0 Policies are rules that create relations between Facets. In 2.1 we saw a policy that says that the list of selectable ids (in the Selection facet) is obtained from the list of input todos (in the Inputs facet).

5.1 Here is a policy that says that highlight follows selection, unless if we are shift-selecting or ctrl-selecting:

```
  const highlightFollowsSelection = (ctr: any) => {
    listen(Selection.get(ctr), "selectItem", ({ itemId, isShift, isCtrl }) => {
      if (!isCtrl && !isShift) {
        Highlight.get(ctr).highlightItem(itemId);
      }
    });
  };
```

5.2 Policies can of course use MobX.reaction to react to data changes.

## Handlers

6.0 Handlers are Policies that handle GUI events by using Facets. They expose methods such as `onKeyUp`/`onKeyDown` that can be used directly in React components.

```
export class EditWithKeys {
  ...
  handle = (keyEdit: string) => ({
    onKeyEvent: (key: string, e: any) => {
      if (key == keyEdit) {
        const editing = Editing.get(this.container);
        editing.setIsEditing(!editing.isEditing);
      }
    },
  })
}

  ...

  // Usage example
  const div =
    <KeyboardEventHandler
      handleKeys={["ctrl+e"]}
      {...ctr.handlers.editWithKeys.handle("ctrl+e")}
    >
      <SomeInternalComponent/>
    </KeyboardEventHandler>;
```
