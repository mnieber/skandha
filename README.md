# SkandhaJS

## Rationale

Despite having a lot of good libraries, programmers still find themselves reimplementing
the same solutions over and over.
The reason is that not every solution can be captured in a library. When there are cross-cutting concerns (aka
aspects, as in aspect oriented programming), then out-of-the-box solutions often do not fit well enough. For this
reason, programmers are often reluctant to store their data in framework-specific data-structures, even though such frameworks could potentially save time.

Skandha proposes an alternative solution (somewhat inspired by Erlang) that aims to let the programmer re-use existing logic,
while allowing them to use their own data-structures. This is achieved by mapping the user's data-structures onto a set of
minimal interfaces called facets. These facets perform tasks by interacting via so-called policies. By keeping facets
minimal, they can be generic, which leads to better code reuse.

## Links

- The [skandha](http://github.com/mnieber/skandha) library contains the basic building blocks
- The [skandha-facets](http://github.com/mnieber/skandha-facets) library contains useful facets such as selection, highlight, filtering, addition, etc.
- The [skandha-mobx](http://github.com/mnieber/skandha-mobx) library contains bindings to MobX
- The [aspiration](http://github.com/mnieber/aspiration) library handles aspect oriented programming (AOP)

## Explanation

The Skandha library will be explained using an example that progressively introduces various concepts
and functions. The example shows how to add reusable selection, highlight and filtering behaviour to a container
with Todo items.

### Containers and Facets

A container is a set of related data, e.g. todo items together with data about selection, highlight, etc. A facet is a
member of a container that represents a single aspect such as `Selection`. In the example below we see a `TodosCtr`
with five facets: `Selection`, `Highlight`, `Filtering`, `Inputs` and `Outputs`. As we shall see, `Selection`,
`Highlight` and `Filtering` are generic (not tied to the concept of a Todo) and therefore reusable.

The `Inputs` facet contains the data (i.e. the todos) that is selected, highlighted and filtered, whereas the `Outputs` facet
contains some of the results that are produced by the container (e.g. the filtered list of todos). It's not strictly
necessary to use `Inputs` and `Outputs` as you could directly connect `Selection`, `Highlight`, and `Filtering` to
data-sources that are outside of the container, but it's easier to reason about the container if they exist.

Our initial code is:

```
    class Selection<ItemT> {}

    class Highlight<ItemT> {}

    class Filtering<ItemT> {}

    class Inputs {
      todoById = {};
    }

    class Outputs {
      filteredTodoById = {};
    }

    class TodosCtr {
      @facet inputs: Inputs = new Inputs();
      @facet outputs: Outputs = new Outputs();
      @facet selection: Selection = new Selection();
      @facet highlight: Highlight = new Highlight();
      @facet filtering: Filtering = new Filtering();
    }
```

### Implementing the Selection facet

We will first implement the Selection facet. The key requirements are that:

- this facet is only concerned with ids. To make a selection in any data-structure, it suffices to map this data-structure
  to a list of ids. And to obtain the list of selected items, it suffices to map in the opposite direction: from ids to items.
- the facet has to be generic, which means that the client code has control over how selection is actually
  performed, and over possible side-effects. This means the client can determine
  the effect of the shift key, or decide that selecting an item should also highlight it.
- preferably the facet has to perform some useful work, and not just be an empty abstraction.

This is our proposal for the Selection facet:

```
class Selection_select extends Cbs {
  selectionParams: SelectionParamsT;
  selectItem() {}
}

class Selection<ItemT> {
  @data selectableIds?: Array<string>;
  @data ids: Array<string> = [];
  @data anchorId: string;
  @data items?: Array<ItemT>;

  @operation @host selectItem(selectionParams: SelectionParamsT) {
    return (cbs: Selection_select) => {
      if (!this.selectableIds.includes(selectionParams.itemId)) {
        throw Error(`Invalid id: ${selectionParams.itemId}`);
      }
      cbs.selectItem();
    }
  }
}
```

Notes:

- The `@data` and `@operation` decorators mark the fields in the facet that make up its abstract interface.
  Clients should use only these fields.
- The `@host` decorator comes from the [Aspiration](http://github.com/mnieber/aspiration) library. It makes
  the function take a set of callbacks that are installed by the client. This allows us to
  write a `Selection` facet that is generic (our 2nd requirement) but also does useful work (3rd requirement).
  We shall discuss below how the `cbs.selectItem` callback is implemented.

### Implementing the Highlight and Filtering facets

Since `Highlight` and `Filtering` follow the same structure as the `Selection` facet, we will only
show the code. For brevity, we will leave out the code for the callback objects such as
`Highlight_highlightItem` (they are straightforward and not that interesting):

```
export class Highlight<ValueT> {
  @data id: string | undefined;
  @data item: ValueT;

  @operation @host highlightItem(id: string) {
    return (cbs: Highlight_highlightItem) => {
      this.id = id;
    };
  }
}

export class Filtering<ValueT> {
  @data isEnabled: boolean = false;
  @data filter: FilterT = () => [];

  @data inputItems?: Array<ValueT>;
  @data get filteredItems() {
    return this.isEnabled ? this.filter(this.inputItems) : this.inputItems;
  }

  @operation @host apply(filter: FilterT) {
    return (cbs: FilteringCbs_apply) => {
      this.filter = filter;
      this.isEnabled = true;
    };
  }

  @operation @host setEnabled(flag: boolean) {
    return (cbs: FilteringCbs_setEnabled) => {
      this.isEnabled = flag;
    };
  }
}
```

### Implementing the callback functions

We've set up the basic structure of the facets, but the callbacks still have to be implemented.
This step happens in the container class. We will use the following requirements:

- the `cbs.selectItem` callback should make a selection that takes the shift and control keys into account.
  We will not show the code (you can see it
  [here](https://github.com/mnieber/skandha-facets/blob/main/Selection.ts)) but assume we have a library
  function `handleSelectItem` for this.
- items that are selected should become highlighted. We will introduce a reusable policy
  function for this called `highlightFollowsSelection`.
- if applying the filter hides the highlighted item then we want to correct the highlight.
  We will use a another reusable policy called `highlightIsCorrectedOnFilterChange` (shown
  [here](https://github.com/mnieber/skandha-facets/blob/main/policies/highlightIsCorrectedOnFilterChange.ts))

```
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
          highlightFollowsSelection(ctr.selection, this.selectionParams);  // See below
        },
      }
    });

    setCallbacks(this.filtering, {
      apply: {
        exit() {
          FacetPolicies.highlightIsCorrectedOnFilterChange(ctr.filtering);
        },
      },
    });
  }
}

export function highlightFollowsSelection(
  selection: Selection,
  selectionParams: SelectionParamsT
) {
  const {isCtrl, isShift, itemId} = selectionParams;
  const ctr = getc(selection);
  if (!isCtrl && !isShift) {
    getf(Highlight, ctr).highlightItem(itemId);
  }
}
```

Notes:

- The call to `registerFacets` is mandatory. It creates a back-reference to the container in each facet
  instance.

### Mapping data onto the container, and between facets

At this point we have a container with facets that perform useful operations, and that interact
to achieve interesting behaviours. However, the container will not yet work because `Selection.selectableIds`
and `Filtering.inputItems` are not connected to any data sources. Note that the client of the container
is responsible for setting `Inputs.todoById` to the collection of todos (at some time after constructing the
container).

As a first step, we need to connect `Filtering.inputItems` to `Inputs.todoById` and `Outputs.filteredTodoById`.
We can think of this as setting up a pipeline, where one of more source facet members are mapped onto a destination
facet member:

```
  _applyPolicies() {
    mapDataToFacet(
      getm[[Inputs, 'todoById'])
      [Filtering, 'inputItems'],
      todoById => Object.values(todoById)
    )(this);

    const listToItemById = items => items.reduce((acc, x) => return {...acc, [x.id]: x}, {})

    mapDataToFacet(
      getm[[Filtering, 'filteredItems'])
      [Outputs, 'filteredTodoById'],
      listToItemById,
    )(this);
  }
```

Notes:

- the first argument to `mapDataToFacet` is a getter function that takes the container and returns some data.
  In this case, it uses the `getm` helper function to return the `todoById` member of the `Inputs` facet.
- the second argument to `mapDataToFacet` is the facet member that receives the data. SkandhaJS will patch the
  facet, replacing the `inputItems` member with a `get inputItems()` property that runs the
  getter function.
- the third argument is a transformation that is applied to the result of the getter function. In this case,
  it means that `get inputItems()` returns `Object.values(getm(Inputs, 'todoById')(ctr))`,

As the next step, we will connect the list of filtered items to `Selection.selectableIds` (so that selection
happens in the filtered list). In addition, we will add datamappings for `Selection.items`
and `Selection.item`:

```
  _applyPolicies() {
    // ...

    mapDataToFacet(
      getm[[Outputs, 'filteredTodoById'])
      [Selection, 'selectableIds'],
      todos => Object.keys(todos)
    )(this);

    mapDatasToFacet(
      [
        getm[[Selection, 'ids']),
        getm[[Inputs, 'todoById']),
      ]
      [Selection, 'items'],
      (ids, todoById) => ids.map(id => todoById[id])
    )(this);

    mapDatasToFacet(
      [
        getm[[Highlight, 'id']),
      ]
      [Highlight, 'item'],
      (id, todoById) => todoById[id])
    )(this);
  }
```

We are done: the facets in the container are connected. Note that if we put these mapping policies in a reusable
library then we can shorten `_applyPolicies` to:

```
  _applyPolicies() {
    // ...

    const policies = [
      FilteringTakesInputItemById([Inputs, 'todoById']),
      FilteringCreatesOutputItemById([Outputs, 'filteredTodoById']),
      SelectionTakesInputItemById([Outputs, 'filteredTodoById']),
    ]

    installPolicies<TodosCtr>(policies, this);
  }
```

### Logging

By calling `setOptions({logging: true})`, the Skandha library allows you to inspect each facet before and
after calling an operation (remember that an operation is any facet member function decorated with @operation).
This will log Facet members that are decorated with `@data` in a way that looks similar to what you are
used to from Redux:

- before and after each operation, the entire container that holds the facet is logged
- all data members of each facet in the container are included in the log
- log entries are nested so that you can see how operation calls are nested

### Making facets observable with Mobx

If you want to render the facets with React then we need to let React know when data changes.
The [skandha-mobx](http://github.com/mnieber/skandha-mobx) library was created for this purpose.
It turns each `@data` member into a Mobx property that is either observable or computed. By decorating
your render function with `observer` you will get a re-render for any changes (in observable facet members)
in the container:

```
class TodosCtr {
  // ...

  constructor() {
    registerFacets(this);
    this._setCallbacks();
    this._applyPolicies();

    // Turn all facets in the container into observable objects.
    // Members annotated with @data will become either @observable or @computed.
    makeCtrObservable(this);
  }
```

## Conclusion

SkandhaJS introduces a lot of new patterns and ideas (that are of course not in fact new) to allow you to
put reusable behaviours on top of your existing data-structures. The difference to a more standard approach
can feel overwhelming, but it's important to point out the beneficial side effect of
separating concerns in a clear and understandable way. We could add a `Editing` facet to our code and install
a policy that says that changing the highlight disables editing. By using facets, we will not be tempted to put
editing-specific code directly in the highlight function (that would obviously be mixing concerns).

In my experience, using SkandhaJS leads to code reuse and improved structure. On top of that, it offers a good
debugging experience (yes, you will still have to debug) by logging all changes in the container. Finally,
it works nicely with MobX to render the container contents.
