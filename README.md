# FacilityJS

## Rationale

Despite having a lot of good libraries, programmers are still reimplementing the same solutions over and over.
The reason is that not every solution can be captured in a library. When there are cross-cutting concerns (aka
aspects, as in aspect oriented programming), then out-of-the-box solutions often do not fit well enough. This is
especially true when the programmer is asked to work with data-structures that are to tightly coupled to a
particular framework (for example: Qt).

Facility proposes an alternative solution (somewhat inspired by Erlang) that aims to let the programmer re-use existing logic, without being forced to use particular data structures everywhere. It let's the programmer map
their custom data-structures on a set of minimal interfaces (called facets) and set up policies that determine how they interact. When these interfaces are truly minimal, they can be generic, which leads to better code reuse.

## Use of MobX

The Facility library works best when it's used in combination with MobX. However, it's possible to use it
without this dependency. For this reason, there are two main libraries: facility and facility-mobx. In this
README I will indicate which functionality depends on MobX.
In general, when the `@observable` decorator is used on a data member, you can use the same code without this
decorator. You only need this decorator when you want to react automatically to data changes using MobX.

## Links

- The [facility]() library contains the basic building blocks
- The [facility-mobx]() library contains the bindings to MobX, as well as a collection of facet classes for
  selection, highlight, filtering, addition, etc.

# Example code:

See this [blog post](https://mnieber.github.io/react/2019/11/27/facet-based-development.html).

# Explanation

The Facility library will be explained using some examples that progressively introduce various concepts
and functions. The example shows how to add reusable selection and highlight behaviour to a container with
Todo items. Note that you may want to skip the Details sections.

## Container and Facets

A Container is a set of related data, e.g. a Todo list and its Todos. A facet is a member of a container
that represents a single aspect of this container, e.g. Selection. In the example below we see a `TodosCtr`
with three facets: `Selection`, `Highlight` and `Inputs`. We are aiming for a design where:

- `Selection` and `Highlight` implement behaviours in a way that is reusable between containers
- facets can be made to interact. For example, we want to enforce the rule that selected items are also
  highlighted.

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
   As we see in the example below, this can make clients agnostic of the container:

```
    function foo(ctr: any) {
      // works for any ctr that has a Selection facet
      selection = Selection.get(ctr);
    }
```

## The mapDatas function (part of facility-mobx)

An important way in which facets can interact is by mapping data from one facet field onto a different
facet field. For example, we may want to fill the `items` member of `Selection` by looking up objects in
in the `todoItemById` field of the `Inputs` facet. The `mapDatas` can be used to perform such mappings.
It takes a specification of one or more input fields (as tuples containing a facet class and an input field name)
and a specification of the output field. The input fields are mapped onto the output field, possibly applying
a transformation function. Note that this mapping is automatically kept up-to-date by MobX.
In the example below, we map `selection.ids` and `inputs.todoItemById` onto `selection.items`:

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

    class TodosCtr { /* see above */ }

    function exampleOfMapDatas(ctr: TodosCtr) {
      mapDatas(
        [[Inputs, "todoItemById"], [Selection, "ids"]],
        [Selection, "items"],
        (itemById, ids) => lookUp(ids, itemById)
      )(ctr);
    }
```

Note: we will see this particular data mapping again later, as the `selectionActsOnItems` policy function.

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

Sometimes, using `MobX.extendObservable` creates a cycle that MobX will complain about. In that case, one can
use `relayDatas`, which has the same signature as `mapDatas` but is implemented using `MobX.reaction`.

## Adding behaviour to facets using callback functions

We will now add a `select` function to the `Selection` facet. We aim for the following:

- we don't want to hard-code how selection is done. Instead, we want to give the client some freedom over how
  this works. For example, in some cases we want to select ranges with the shift key, but in other cases
  we only want to allow selection of single items.
- we want to allow the client to setup additional behaviour that happens when an item is selected. For example,
  we may want to also highlight the selected item

To achieve these aims we will base the `select`` function on an aspect oriented framework described
here: <url here>. Specifically, we will:

- add members `selectableIds` and `anchorId` to the `Selection` facet.
- add a `select` function to `Selection` that receives the id of the newly selected item and
  sets the new contents of `selection.ids`. The `select` function will be a Template Method that triggers a callback function to do the actual work.
- (in a next step, described later) install handlers for this callback in the constructor of `TodosCtr`.
  These handlers will take care of updating the selection and highlighting the selected item.

The `Selection` facet now looks like this (note that `@operation` and `exec` come from <AOP ref here>):

```
export class Selection<ItemT> {
  @observable selectableIds?: Array<string>;
  @observable ids: Array<string> = [];
  @observable anchorId: string;
  @observable items?: Array<ItemT>;

  @operation select({ itemId, isShift, isCtrl }) {
    if (!this.selectableIds.contains(itemId)) {
      throw Error(`Invalid id: ${itemId}`);
    }
    exec("selectItem");
  }

  static get = (ctr: any): Selection => ctr.selection;
}
```

## Setting up policies inside a container class

We will make the following changes to `TodosCtr`:

- install a policy that fills `selection.selectableIds` based on `inputs.todoItemById`.
- install a handler for the "selectItem" callback
- install an additional handler for "selectItem" to ensure that selected items are also highlighted

The `TodoListContainer` now looks like this:

```
import { Selection, handleSelectItem } from 'facility-mobx/facets/Selection';
// other imports omitted

class TodosCtr {
  @facet selection: Selection = new Selection();
  @facet highlight: Highlight = new Highlight();
  @facet inputs: Inputs = new Inputs();

  constructor() {
    registerFacets(this);
    this._installActions();
    this._applyPolicies();
  }

  _installActions() {
    setCallbacks(this.selection, {
      select: {
        // install the default selection handler as a callback
        selectItem: [handleSelectItem],
        // install a rule that ensures that selected items are highlighted
        selectItem_post: [MobXPolicies.highlightFollowsSelection],
      }
    });
  }

  _applyPolicies() {
    // Create mapping onto selection.selectableIds. Remember that mapDatas depends on MobX
    mapDatas([[Inputs, 'todoItemById']], [Selection, 'selectableIds'], getIds)(this);
    // Map onto selection.items. See explanation below
    selectionActsOnItems([Inputs, "todoItemById"])(this);
  }
}
```

Notes:

0. The call to `registerFacets` is mandatory. It creates a back-reference to the container in each facet
   instance.
1. The `setCallbacks` function comes from <AOP ref here>. We use it here to install callback functions that
   handle selection and make sure that selected items are highlighted.
1. The `selectionActsOnItems` function is a reusable helper that provides a data mapping from an "itemById"
   field onto the `selection.items` field. It's implemented as follows:

   ```
     export const selectionActsOnItems = ([Collection, itemById]) =>
       mapDatas(
         [[Collection, itemById], [Selection, "ids"]],
         [Selection, "items"],
         (itemById, ids) => lookUp(ids, itemById)
       );
   ```

1. A more concise way to write the `_installPolicies` function is as follows:

   ```
      _applyPolicies() {
        const policies = [
          mapDatas([[Inputs, 'todoItemById']], [Selection, 'selectableIds'], getIds),
          selectionActsOnItems([Inputs, "todoItemById"]),
        ];

        installPolicies(policies, this);
      }
   ```

Let's review what we've achieved:

1. Our container uses reusable classes for Selection and Highlight.
2. We've set up interaction between the Selection, Highlight and Inputs facets using mapping functions that
   are either reusable (`selectionActsOnItems`, `highlightFollowsSelection`) or generic (`mapDatas`).
3. The interactions between facets are made explicit in the TodosCtr class. This makes the interactions easier to
   discover than if they had been inserted directly into the facets.

## Logging

The Facility library allows you to inspect each facet before and after calling an operation. An operation is any
facet member function that is decorated with @operation. You can turn on logging as follows:

```
import { options as facetOptions } from 'facet';

options.logging = true;
```

Facet members that are decorated with `@input`, `@output` and `@data` (these decorators are all the same,
the difference in name is just to help the reader understand the intention behind the data members).

```
export class Selection<ItemT> {
  @observable @input selectableIds?: Array<string>;  // this is logged
  @observable ids: Array<string> = [];               // this is not logged

  // other members omitted
}
```

The logging looks similar to what you are used to from Redux:

- before and after each operation, the entire container that holds the facet is logged
- all decorated data members of each facet in the container are included in the log
- log entries are nested so that you can see how operation calls are nested

TODO: add image.

## Overriding an operation

It's also possible to completely override the body of an operation in an already instantiated facet. This can be
useful when the default implementation of the operation is not suitable:

```
handle(
  ctr.selection,
  "select",
  ({itemId, isShift, isCtrl}) => { /* do something */},
);
```

## Signalling: operations

When calling an operation on a facet, it's possible to notify clients who are outside of the container. This
is done by connecting to a signal:

```
listen(
  ctr.selection,
  "select",
  ({itemId, isShift, isCtrl}) => { /* do something */},
  { after: true,  // this is the default option }
);
```

The last argument is a dictionary of options. This argument is optional. If you set `after: false` then the
signal will be received before the operation is called.

## Signalling: other information

The signalling mechanism that is used to notify listeners of operations can also be used to signal other
kinds of information. The `sendMsg` function can be used to emit any information:

```
function foo(ctr: TodosCtr) {
  const topic = 'Selection.sizeInformation';
  const details = {
    newSize: 1001
  };
  sendMsg(ctr.selection, topic, details);
}
```

The `subscribe` function is used to subscribe to a topic:

```
function bar(ctr: TodosCtr) {
  subscribe(ctr.selection, 'Selection.*', (msg: any) => {
    console.log(msg.details);
  };);
}
```

## Various helper functions

- `facetName(facet)` returns the name of the facet given the facet instance
- `facetClassName(facetClass)` returns the name of the facet given the facet class
- `ctrState(ctr)` collects all data members of all facets in a dictionary (used in logging)
- `getCtr(facet)` returns the container for a facet
