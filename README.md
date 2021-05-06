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

---

**NOTE**

The binding of facets to containers in Skandha relies on class names. Therefore you
need to disable the mangling of classnames in your minification tool, or disable minification completely. A future version of Skandha will allow you to declare
facet names by adding a property in the facet class, or specify the names when calling
`registerFacets`.

---

## Links

- The [skandha](http://github.com/mnieber/skandha) library contains the basic building blocks
- The [skandha-facets](http://github.com/mnieber/skandha-facets) library contains useful facets such as selection, highlight, filtering, addition, etc.
- The [skandha-mobx](http://github.com/mnieber/skandha-mobx) library contains bindings to MobX
- The [aspiration](http://github.com/mnieber/aspiration) library handles aspect oriented programming (AOP)

## Example code

The full example code for this README can be found [here](http://github.com/mnieber/skandha-sample-app). Note that this repository
contains two version of the example code. The frst version creates all the behaviours from scratch. Although it gives a good insight into
the Skandha principles, the code will look bulky. The second version is reflective of a real use-case as it uses the reusable behaviours
from [skandha-facets](http://github.com/mnieber/skandha-facets).

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
    class Selection<TodoT> {}

    class Highlight<TodoT> {}

    class Filtering<TodoT> {}

    class Inputs {
      @data todoById: TodoByIdT = {};
    }

    class Outputs {
      @data filteredTodoById: TodoByIdT = {};
    }

    class TodosCtr {
      @facet inputs: Inputs = new Inputs();
      @facet outputs: Outputs = new Outputs();
      @facet selection: Selection<TodoT> = new Selection<TodoT>();
      @facet highlight: Highlight<TodoT> = new Highlight<TodoT>();
      @facet filtering: Filtering<TodoT> = new Filtering<TodoT>();
    }
```

Notes:

- The `@data` and `@operation` decorators mark the fields in the facet that make up its abstract interface.
  Clients should use only these fields.

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
export class Selection_select extends Cbs {
  selectionParams: SelectionParamsT = stub();
  selectItem() {}
}

class Selection<TodoT> {
  @data selectableIds: Array<string> = stub();
  @data ids: Array<string> = [];
  @data anchorId?: string;
  @data items?: Array<ValueT>;

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

- The `@host` decorator comes from the [Aspiration](http://github.com/mnieber/aspiration) library. It makes
  the function take a callback object (i.e. a set of callbacks) that is installed by the client. This allows us to
  write a `Selection` facet that is generic (our 2nd requirement) but also does useful work (3rd requirement).
  We shall discuss below how the `cbs.selectItem` callback is implemented.
- The `stub` function is used in callback objects to indicate that although the field is initialized with `undefined`
  it will receive a value later.

### Implementing the Highlight and Filtering facets

Since `Highlight` and `Filtering` follow the same structure as the `Selection` facet, we will only
show the code. For brevity, we will leave out the code for the callback objects such as
`Highlight_highlightItem` (they are straightforward and not that interesting):

```
export class Highlight<ValueT = any> {
  @data id: string | undefined;
  @data item?: ValueT;

  @operation @host highlightItem(id: string) {
    return (cbs: Highlight_highlightItem) => {
      this.id = id;
    };
  }
}

export class Filtering<ValueT = any> {
  @data isEnabled: boolean = false;
  @data filter: FilterT = () => [];

  @data inputItems?: Array<ValueT>;
  @data get filteredItems() {
    return this.isEnabled ? this.filter(this.inputItems) : this.inputItems;
  }

  @operation @host apply(filter: FilterT) {
    return (cbs: Filtering_apply) => {
      this.filter = filter;
      this.isEnabled = true;
    };
  }

  @operation @host setEnabled(flag: boolean) {
    return (cbs: Filtering_setEnabled) => {
      this.isEnabled = flag;
    };
  }
}
```

### Implementing the callback objects

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
- The `getc` gets the container for a given facet, whereas `getf` gets a facet for a given container.

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
      [Filtering, 'inputItems'],
      getm([Inputs, 'todoById']),
      (x: TodoByIdT) => Object.values(x)
    )(this);

    const listToItemById = items => items.reduce((acc: any, x: TodoT) => ({ ...acc, [x.id]: x }), {})

    mapDataToFacet(
      [Outputs, 'filteredTodoById'],
      getm([Filtering, 'filteredItems']),
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
      [Selection, 'selectableIds'],
      getm([Outputs, 'filteredTodoById']),
      (x: TodoByIdT) => Object.keys(x)
    )(this);

    mapDatasToFacet(
      [Selection, 'items'],
      [
        getm([Selection, 'ids']),
        getm([Inputs, 'todoById']),
      ],
      (ids: string[], todoById: TodoByIdT) => ids.map((id) => todoById[id])
    )(this);

    mapDatasToFacet(
      [Highlight, 'item'],
      [
        getm([Highlight, 'id']),
        getm([Inputs, 'todoById']),
      ],
      (id: string, todoById: TodoByIdT) => todoById[id]
    )(this);
  }
```

We are done: the facets in the container are connected. Note that if we put these mapping policies in a reusable
library then we can shorten `_applyPolicies` to:

```
  _applyPolicies() {
    // ...

    const policies = [
      // selection
      SelectionUsesSelectableIds([Outputs, 'filteredTodoById'], Object.keys),
      SelectionUsesItemLookUpTable([Inputs, 'todoById']),

      // highlighting
      HighlightUsesItemLookUpTable([Inputs, 'todoById']),

      // filtering
      FilteringUsesInputItems([Inputs, 'todoById'], Object.values),
      mapDataToFacet(
        [Outputs, 'filteredTodoById'],
        getm([Filtering, 'filteredItems']),
        listToItemById,
      ),
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
