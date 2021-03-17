# SkandhaJS

## Rationale

Despite having a lot of good libraries, programmers are still reimplementing the same solutions over and over.
The reason is that not every solution can be captured in a library. When there are cross-cutting concerns (aka
aspects, as in aspect oriented programming), then out-of-the-box solutions often do not fit well enough. This is
especially true when the programmer is asked to work with data-structures that are to tightly coupled to a
particular framework (for example: Qt).

Skandha proposes an alternative solution (somewhat inspired by Erlang) that aims to let the programmer re-use existing logic, without being forced to use particular data structures everywhere. It let's the programmer map
their custom data-structures on a set of minimal interfaces (called facets) and set up policies that determine how they interact. When these interfaces are truly minimal, they can be generic, which leads to better code reuse.

## Links

- The [skandha](http://github.com/mnieber/skandha) library contains the basic building blocks
- The [skandha-facets](http://github.com/mnieber/skandha-facets) library contains useful facets such as selection, highlight, filtering, addition, etc.
- The [skandha-mobx](http://github.com/mnieber/skandha-mobx) library contains bindings to MobX
- The [aspiration](http://github.com/mnieber/aspiration) library handles aspect oriented programming (AOP)

## Explanation

The Skandha library will be explained using some examples that progressively introduce various concepts
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
    class Selection<ItemT> {}

    class Highlight<ItemT> {}

    class Inputs {
      todoItemById = {};
    }

    class TodosCtr {
      @facet inputs: Inputs;
      @facet selection: Selection;
      @facet highlight: Highlight;
    }
```

### Connecting Selection to Inputs using mapDatasToFacet

We now have skeletons for our reusable `Selection` and `Highlight` facets, and we have a simple `Inputs` facet
(that we don't intend to reuse) with "todo" data that we wish to select or highlight. The next steps are to:

- add some data members related to selection and highlighting to the correspondings facets
- create our first projection between `Inputs` and `Selection`. This projection reads the selected ids and converts
  them into a set of selected Todos that is stored in the `Selection` facet (more below we will use
  the `selectionActsOnItems` helper function for this purpose):

```
    class Selection<ItemT> {
      @input selectableIds?: Array<string>;
      @data ids: Array<string> = [];
      @data anchorId: string;
      @output items?: Array<ItemT>;
    }

    class TodosCtr { /* see above */ }

    function exampleOfMapDatas(ctr: TodosCtr) {
      mapDatasToFacet(
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
}

class TodosCtr {
  // ...

  constructor() {
    registerFacets(this);
    this._setCallbacks();
  }

  _setCallbacks() {
    const ctr = this;

    setCallbacks(this.selection, {
      select: {
        // install the default selection handler as a callback
        selectItem(this: Selection_select): {
          handleSelectItem(ctr.selection, this.selectionParams);
          FacetPolicies.highlightFollowsSelection(ctr.selection, this.selectionParams);
        },
      }
    });
  }
}

```

### Setting up policies inside a container class

Next we will install a policy in `TodosCtr` that fills `selection.selectableIds` based on `inputs.todoItemById`.

```
import { Selection, handleSelectItem } from 'skandha-facets/Selection';
// other imports omitted

class TodosCtr {
  // ...

  constructor() {
    registerFacets(this);
    this._setCallbacks();
    this._applyPolicies();
  }

  _setCallbacks() {
  // ...
  }

  _applyPolicies() {
    // Create mapping onto selection.selectableIds.
    mapDatasToFacet([[Inputs, 'todoItemById']], [Selection, 'selectableIds'], getIds)(this);
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
       mapDatasToFacet(
         [[Collection, itemById], [Selection, "ids"]],
         [Selection, "items"],
         (itemById, ids) => lookUp(ids, itemById)
       );
   ```

Let's review what we've achieved:

1. Our container uses reusable classes for `Selection` and `Highlight`.
2. We've connected our input data to the `Selection` and `Highlight` facets using `mapDatasToFacet`.
3. We've set up a callback function that handles the actual selection
4. We've set up and interaction between the `Selection` and `Highlight` by calling the `highlightFollowsSelection`
   function in the callback function that handles selection.
5. The interactions between facets are made explicit in the TodosCtr class. This makes the interactions easier to
   discover than if they had been inserted directly into the facets.

### Various helper functions

- `facetName(facet)` returns the name of the facet given the facet instance
- `facetClassName(facetClass)` returns the name of the facet given the facet class
- `ctrState(ctr)` collects all data members of all facets in a dictionary (used in logging)
- `getc(facet)` returns the container for a facet

## Details

### Logging

The Skandha library allows you to inspect each facet before and after calling an operation. An operation is any
facet member function that is decorated with @operation. You can turn on logging as follows:

```
import { options as facetOptions } from 'facet';

options.logging = true;
```

Facet members that are decorated with `@input`, `@output` and `@data` (these decorators are all the same,
the difference in name is just to help the reader understand the intention behind the data members).

```
export class Selection<ItemT> {
  @input selectableIds?: Array<string>;  // this is logged
  foo: Array<string> = [];               // this is not logged

  // other members omitted
}
```

The logging looks similar to what you are used to from Redux:

- before and after each operation, the entire container that holds the facet is logged
- all decorated data members of each facet in the container are included in the log
- log entries are nested so that you can see how operation calls are nested

TODO: add image.

### Implementation of mapDatasToFacet

Internally, `mapDatasToFacet` creates a property on the target instance that returns data from the source instance. In the above example, the use of `mapDatasToFacet` to fill
``selection.selectableIds` is equivalent to calling

```
Object.defineProperty(
  ctr.selection,
  {
    selectableIds: {
      get: lookUp(ctr.selection.ids, ctr.inputs.todoItemById)
    }
  }
);
```
