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

- The [facility](http://github.com/mnieber/facility) library contains the basic building blocks
- The [facility-mobx](http://github.com/mnieber/facility-mobx) library contains the bindings to MobX, as well as a collection of facet classes for
  selection, highlight, filtering, addition, etc.
- The [aspiration](http://github.com/mnieber/aspiration) library handles aspect oriented programming (AOP)

## Explanation

The Facility library will be explained using some examples that progressively introduce various concepts
and functions. The example shows how to add reusable selection and highlight behaviour to a container with
Todo items.

### Container and Facets

A container is a set of related data, e.g. a Todo list and its Todos. A facet is a member of a container
that represents a single aspect of this container, e.g. `Selection`. In the example below we see a `TodosCtr`
with three facets: `Selection`, `Highlight` and `Inputs`. We are aiming for a design where:

- `Selection` and `Highlight` implement behaviours in a way that is reusable between containers
- facets can be made to interact. For example, we want to enforce the rule that selected items are also
  highlighted.

Our initial code is:

```
    class Selection<ItemT> {
      static get = (ctr: any): Selection => ctr.selection;
    }

    class Highlight<ItemT> {
      static get = (ctr: any): Highlight => ctr.highlight;
    }

    class Inputs {
      @observable todoItemById = {};
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

### Connecting Selection to Inputs using mapDatas (part of facility-mobx)

We now have skeletons for our reusable `Selection` and `Highlight` facets, and we have a simple `Inputs` facet
(that we don't intend to reuse) with "todo" data that we wish to select or highlight. The next steps are to:

- add some data members related to selection and highlighting to the correspondings facets
- create our first projection between `Inputs` and `Selection`. This projection reads the selected ids and converts
  them into a set of selected Todos that is stored in the `Selection` facet (more below we will use
  the `selectionActsOnItems` helper function for this purpose):

```
    class Selection<ItemT> {
      @observable selectableIds?: Array<string>;
      @observable ids: Array<string> = [];
      @observable anchorId: string;
      @observable items?: Array<ItemT>;

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

### Adding behaviour to facets using callback functions

We will now add a `select` function to the `Selection` facet. We aim for the following:

- we don't want to hard-code how selection is done. Instead, we want to give the client some freedom over how
  this works. For example, in some cases we want to select ranges with the shift key, but in other cases
  we only want to allow selection of single items.
- we want to allow the client to setup additional behaviour that happens when an item is selected. For example,
  we may want to also highlight the selected item

To achieve these aims we will base the `select` function on an aspect oriented framework described [here](http://github.com/mnieber/aspiration). Specifically, we will add a `select`function to the`Selection`facet that receives the id of the newly selected item. This function triggers a callback function to do the actual work of setting the contents of`selection.ids`. The function also calls the `highlightFollowsSelection` function to ensure that highlight follows
selection.

```
class Selection_select {
  selectionParams: SelectionParamsT;
  selectItem() {}
}

export class Selection<ItemT> {
  // ...

  @operation @host select(selectionParams: SelectionParamsT) {
    return (cbs: Selection_select) {
      const { itemId, isShift, isCtrl } = selectionParams;
      if (!this.selectableIds.contains(itemId)) {
        throw Error(`Invalid id: ${itemId}`);
      }
      cbs.selectItem();
    }
  }

  static get = (ctr: any): Selection => ctr.selection;
}

class TodosCtr {
  // ...

  constructor() {
    registerFacets(this);
    this._installActions();
  }

  _installActions() {
    const ctr = this;

    setCallbacks(this.selection, {
      select: {
        // install the default selection handler as a callback
        selectItem(this: Selection_select): {
          handleSelectItem(ctr.selection, this.selectionParams);
          MobXPolicies.highlightFollowsSelection(ctr.selection, this.selectionParams);
        },
      }
    });
  }
}

```

### Setting up policies inside a container class

Next we will install a policy in `TodosCtr` that fills `selection.selectableIds` based on `inputs.todoItemById`.

```
import { Selection, handleSelectItem } from 'facility-mobx/facets/Selection';
// other imports omitted

class TodosCtr {
  // ...

  constructor() {
    registerFacets(this);
    this._installActions();
    this._applyPolicies();
  }

  _installActions() {
  // ...
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
1. The `setCallbacks` function comes from [Aspiration](http://github.com/mnieber/aspiration). We use it here to
   install callback functions that handle selection and make sure that selected items are highlighted.
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

Let's review what we've achieved:

1. Our container uses reusable classes for `Selection` and `Highlight`.
2. We've connected our input data to the `Selection` and `Highlight` facets using `mapDatas`.
3. We've set up a callback function that handles the actual selection
4. We've set up and interaction between the `Selection` and `Highlight` by calling the `highlightFollowsSelection`
   function in the callback function that handles selection.
5. The interactions between facets are made explicit in the TodosCtr class. This makes the interactions easier to
   discover than if they had been inserted directly into the facets.

### Signalling: operations

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

### Various helper functions

- `facetName(facet)` returns the name of the facet given the facet instance
- `facetClassName(facetClass)` returns the name of the facet given the facet class
- `ctrState(ctr)` collects all data members of all facets in a dictionary (used in logging)
- `getCtr(facet)` returns the container for a facet

## Details

### Overriding an operation

It's also possible to completely override the body of an operation in an already instantiated facet. This can be
useful when the default implementation of the operation is not suitable:

```
handle(
  ctr.selection,
  "select",
  ({itemId, isShift, isCtrl}) => { /* do something completely different */},
);
```

### Logging

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

### Signalling: other information

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

### Implementation of mapDatas

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
