# Facet

## Rationale

Despite having a lot of good libraries, programmers are still reimplementing the same solutions over and over.
The reason is that not every solution can be captured in a library. When there are cross-cutting concerns (aka
aspects, as in aspect oriented programming), then out-of-the-box solutions often do not fit well enough. This is
especially true when the programmer is asked to work with data-structures that are to tightly coupled to a
particular framework (for example: Qt).

Facet proposes an alternative solution (somewhat inspired by Erlang) that aims to let the programmer re-use existing logic, without being forced to use particular data structures everywhere. It let's the programmer map
their custom data-structures on a set of minimal interfaces (called facets) and set up policies that determine how they interact. When these interfaces are truly minimal, they can be generic, which leads to better code reuse.

# Example code:

See this [blog post](https://mnieber.github.io/react/2019/11/27/facet-based-development.html).

# Explanation

The Facet library will be explained using some examples that progressively introduce various concepts
and functions. The example shows how to add reusable selection and highlight behaviour to a container with
Todo Items. Note that you may want to skip the Details sections.

## Container and Facets

A Container is a set of related data, e.g. a Todo list and its Todos. A facet is a member of a container
that represents a single aspect of this container, e.g. Selection. In the example below we see a `TodosContainer`
with three facets: `Selection`, `Highlight` and `Inputs`. We are aiming for a design where:

- `Selection` and `Highlight` implement behaviours in a way that is reusable between containers
- facets can be made to interact. For example, we may want to enforce a rule that when an item is selected,
  it also is highlighted.

Our initial code is:

```
    class Selection<ItemT> {
      // other members omitted
      static get = (ctr: any): Selection => ctr.selection;
    }

    class Highlight<ItemT> {
      // other members omitted
      static get = (ctr: any): Highlight => ctr.highlight;
    }

    class Inputs {
      // other members omitted
      static get = (ctr: any): Inputs => ctr.inputs;
    }

    class TodosCtr {
      @facet inputs: Inputs;
      @facet selection: Selection;
      @facet highlight: Highlight;
    }
```

Notes:

1. Facets are implemented as classes that have a static get function to retrieve the facet from its container.
   As we see in the `foo` example function below, this can make clients agnostic of the container:

```
    function foo(ctr: any) {
      // works for any ctr that has a Selection facet
      selection = Selection.get(ctr);
    }
```

## The mapDatas function

An important way in which facets can interact is by mapping data from one facet field onto a different
facet field. For example, we may want to fill the `items` member of `Selection` by looking up objects in
in the `todoItemById` field of the `Inputs` facet. The `mapDatas` can be used to perform such mappings.
It takes a specification of one or more input fields (as tuples containing a facet class and an input field name)
and a specification of the output field. It maps the input fields onto the output field,
possibly applying a transformation function. Note that this mapping is automatically kept up-to-date by MobX.
In the example below, we map `selection.ids` and `inputs.todoItemById` onto the `items` field of the `Selection`
facet:

```
    class Inputs {
      @observable todoItemById = {};
      static get = (ctr: any): Inputs => ctr.inputs;
    }

    class Selection<ItemT> {
      @observable ids: Array<string> = [];
      items?: Array<ItemT>;

      // other members omitted
      static get = (ctr: any): Selection => ctr.selection;
    }

    function exampleOfMapDatas(ctr: TodosContainer) {
      mapDatas(
        [[Inputs, "todoItemById"], [Selection, "ids"]],
        [Selection, "items"],
        (itemById, ids) => lookUp(ids, itemById)
      )(ctr);
    }
```

Note: we will see this particular data mapping again later, as the `selectionActsOnItems` function.

### Details

Internally, `mapDatas` uses `MobX.extendObservable` to create a `@computed` property on the target instance that returns data from the source instance. In the above example, the use of `mapDatas` to fill
``selection.selectableIds` is equivalent to calling

```
MobX.extendObservable(
  ctr.selection,
  {
    get selectableIds() {
      return lookUp(ctr.selection.ids, ctr.inputs.todoItemById);
    }
  }
);
```

Sometimes, using `MobX.extendObservable` creates a cycle the MobX will complain about. In that case, one can use `relayDatas`, which has the same signature as `mapDatas` but is implemented using `MobX.reaction`.

## Adding behaviour to Facets using callback functions

We will now add a `selectItem` function to the `Selection` facet. We aim for the following:

- we don't want to hard-code how selection is done. Instead, we want to give the client some freedom over how
  this works. For example, in some cases we want to select ranges with the shift key, but in other cases
  we only want to allow selection of single items.
- we want to allow the client to setup additional behaviour that happens when an item is selected. For example,
  we may want to also highlight the selected item

To achieve these aims we will base the `selectItem`` function on an aspect oriented framework described
here: <url here>. Specifically, we will:

- add members `selectableIds` and `anchorId` to the `Selection` facet.
- add a `selectItem` function to `Selection` that receives the id of the newly selected item and
  sets the new contents of `selection.ids`. The `selectItem` function will be basically an empty shell that triggers a callback function to do the actual work.
- (in a next step, described later) install handlers for this callback in the constructor of `TodosContainer`.
  These handlers will take care of updating the selection and highlighting the selected item.

The `Selection` facet now looks like this (note that `exec` and `operation` come from <AOP ref here>):

```
export class Selection<ItemT> {
  @observable selectableIds?: Array<string>;
  @observable ids: Array<string> = [];
  @observable anchorId: string;
  @observable items?: Array<ItemT>;

  @operation selectItem({ itemId, isShift, isCtrl }) {
    if (!this.selectableIds.contains(itemId)) {
      throw Error(`Invalid id: ${itemId}`);
    }
    exec("selectItem");
  }

  static get = (ctr: any): Selection => ctr.selection;
}
```

## Setting up policies inside a container class

We will make the following changes to `TodosContainer`:

- install a policy that fills `selection.selectableIds` based on `inputs.todoItemById`.
- install a handler for the "selectItem" callback
- install an additional handler for "selectItem" to ensure that selected items are also highlighted

The `TodoListContainer` now looks like this:

```
import { Selection, handleSelectItem } from 'facet-mobx/facets/Selection';
// other imports omitted

class ToDoListContainer {
  @facet selection: Selection = new Selection();
  @facet highlight: Highlight = new Highlight();
  @facet inputs: Inputs = new Inputs();

  constructor() {
    this._installActions();
    this._applyPolicies();
  }

  _installActions() {
    installActions(this.selection, {
      selectItem: {
        // install the default selection handler as a callback
        selectItem: [handleSelectItem],
        // install a rule that ensures that selected items are highlighted
        selectItem_post: [MobXPolicies.highlightFollowsSelection],
      }
    });
  }

  _applyPolicies() {
    // Create mapping onto selection.selectableIds
    mapData([Inputs, 'todoItemById'], [Selection, 'selectableIds'], getIds),
    // Map onto selection.items. See explanation below
    selectionActsOnItems([Inputs, "todoItemById"])(this);
  }
}
```

Notes:

1. the `installActions` function comes from <AOP ref here>. We use it here to install callback functions that
   handle selection and make sure that selected items are highlighted.

2. The `selectionActsOnItems` function provides a data mapping from an "itemById" field onto the
   `selection.items` field. It's implemented as follows:

   ```
     export const selectionActsOnItems = ([Collection, itemById]) =>
       mapDatas(
         [[Collection, itemById], [Selection, "ids"]],
         [Selection, "items"],
         (itemById, ids) => lookUp(ids, itemById)
       );
   ```

Let's review what we've achieved:

1. Our container uses reusable classes for Selection and Highlight.
2. We've set up interaction between the Selection, Highlight and Inputs facets using mapping functions that
   are either reusable (`selectionActsOnItems`, `highlightFollowsSelection`) or generic (`mapDatas`).
3. The interation between facets is made explicit in the TodosContainer class, instead of burying it inside
   the facets themselves where it would be hard to discover.

## Logging

2.0 Facets usually contain data.

```
    class Selection {
      @observable @data ids: Array<any> = [];
      @observable @input selectableIds: Array<any>;
      @observable @output items: Array<any>;
      ...
}
```

Fields marked with `@input` and `@output` are slots to be filled by policies. Fields marked with `@data` are managed by the Facet directly. The `@observable` decorator comes from MobX.

## Operations

3.0 Facets can declare operations. These are signals that can be handled by the facet itself or by a policy.

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

## Policies

5.0 Policies are rules that create relations between facets. In 2.1 we saw a policy that says that the list of selectable ids (in the Selection facet) is obtained from the list of input todos (in the Inputs facet).

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

6.0 Handlers are Policies that handle GUI events by using facets. They expose methods such as `onKeyUp`/`onKeyDown` that can be used directly in React components.

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
