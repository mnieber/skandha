# SkandhaJS

## Rationale

The goal of SkandhaJS is to provide data containers that have reusable behaviors, such as
selection, highlighting, filtering, drag-and-drop, etc. The only requirement for using these containers is
that every item in the container has a unique id. When combining behaviors in a container, you need to
make sure that they interact properly. For example, when selecting an item you may want the item also to
be highlighted. As we will see, these interactions are achieved by implementing callback functions.

---

**NOTE**

In a Skandha container, behaviors are implemented using classes that are called facets, and they are found by their class name. The recommendation is to add a `static className` function to each facet class. If you omit this function, then Skandha will use the automatically generated class name, which can cause problems with the mangling of classnames in your minification tool.

---

## Links

- The [skandha](http://github.com/mnieber/skandha) library contains the basic building blocks
- The [skandha-facets](http://github.com/mnieber/skandha-facets) library contains useful facets such as selection, highlight, filtering, addition, etc.
- The [skandha-mobx](http://github.com/mnieber/skandha-mobx) library contains bindings to MobX
- The [aspiration](http://github.com/mnieber/aspiration) library handles aspect oriented programming (AOP)

## Example code

The full example code for this README can be found [here](http://github.com/mnieber/skandha-sample-app). Note that this repository
contains two version of the example code. The first version creates all the behaviours from scratch. Although it gives a good insight into
the Skandha principles, the code will look bulky. The second version is reflective of a real use-case as it uses the reusable behaviours
from [skandha-facets](http://github.com/mnieber/skandha-facets).

## Explanation

### The Selection facet

As mentioned above, behaviors in Skandha are implemented as classes that are called facets. Let's start by looking at a reusable
Selection facet. Before we show how it's implemented, here is an example of using it to select a range of
items from id `2` to id `5`:

```
const ctr = createContainer();
ctr.selection.selectableIds = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

ctr.selection.selectItem({itemId: "2"});
ctr.selection.selectItem({itemId: "5", isShift: true});
console.log(ctr.selection.ids);
```

Note that the key function call here is `selection.selectItem`. Let's look at how it's implemented. First of all, we need a type that holds the selection parameters:

```
export type SelectionParamsT = {
  itemId: string | undefined;
  isShift?: boolean;
  isCtrl?: boolean;
};
```

The next step is less obvious: we define a helper class that declares the arguments and callbacks of
`selection.selectItem`. Why is this needed? The reason for using a callback function is that we
don't want to hard code how selection is performed (e.g. what the effect of the shift and ctrl key is),
because this would limit the reusability. The reason for storing the arguments of `selection.selectItem`
is that this makes it easier to pass these arguments to other functions that want to use
them. For example, if a side-effect of selection is to highlight the item, then we
would like to pass the `SelectionParamsT` instance also to a `highlightSelectedItem` policy function
(this will be explained in detail later). The helper class looks like this:

```
export class Selection_selectItem extends Cbs {
  selectionParams: SelectionParamsT = stub();
  select() {}
}
```

Next, we add the `Selection` class itself that has a `selectItem` function that checks the selection
parameters and then calls the `select` callback function.

```
class Selection<ValueT> {
  @data selectableIds: Array<string> = stub();
  @data ids: Array<string> = [];
  @data anchorId?: string;
  @data items?: Array<ValueT>;  // ignore this field for now...

  @operation @host selectItem(selectionParams: SelectionParamsT) {
    return (cbs: Selection_selectItem) => {
      if (!this.selectableIds.includes(selectionParams.itemId)) {
        throw Error(`Invalid id: ${selectionParams.itemId}`);
      }
      cbs.select();
    }
  }
}
```

And finally, we add the `createContainer` function that creates a `Selection` instance and implements
the `select` callback. We don't show the code of `handleSelectItem`, but you can see it
[here](https://github.com/mnieber/skandha-facets/blob/main/Selection.ts).

```
const createContainer() {
  const ctr = {
    selection: new Selection()
  };

  setCallbacks(ctr.selection, {
    selectItem: {
      select(this: Selection_selectItem): {
        handleSelectItem(ctr.selection, this.selectionParams);
      },
    }
  });

  return ctr;
}
```

Notes:

- The `@host` decorator comes from the [Aspiration](http://github.com/mnieber/aspiration) library.
- The `stub` function is used in callback objects to indicate that although the field is initialized with `undefined` it will receive a value later.

## Combining Selection with Highlight

So far, we have shown a rather indirect implementation of selection. This indirect approach becomes useful
when we add a second facet: Highlight. We will extend the example such that when the user selects an item,
it will also be highlighted. The same approach can be used to make sure that the Filtering and Highlight
facets work well together: if the filter is enabled, the highlight moves to an item that is not hidden by the
filter. In general, there are many possibilities to create complex behaviors this way.

Let's start by looking at the code of the `Highlight` facet:

```
export class Highlight_highlightItem extends Cbs {
  id: string = stub();
  scrollItemIntoView() {}
}

export class Highlight<ValueT = any> {
  @data id: string | undefined;
  @data item?: ValueT;  // ignore this field for now...

  @operation @host highlightItem(id: string) {
    return (cbs: Highlight_highlightItem) => {
      this.id = id;
      maybe(cbs.scrollItemIntoView).bind(cbs)();
    };
  }
}
```

We can now update `createContainer` with the `Highlight` facet:

```
const createContainer() {
  const ctr = {
    selection: new Selection(),
    highlight: new Highlight()
  };

  setCallbacks(ctr.selection, {
    selectItem: {
      select(this: Selection_selectItem): {
        handleSelectItem(ctr.selection, this.selectionParams);
        if (!this.selectionParams.isShift && !this.selectionParams.isCtrl) {
          ctr.highlight.highlightItem(this.selectionParams.itemId);
        }
      },
    }
  });

  return ctr;
```

### Adding the Filtering facet

Now, let's add filtering. For brevity, the definition of `Filtering_apply` and `Filtering_enable`
is skipped. Also, we assume that the logic for highlighting the select item is captured in a policy
function called `highlightFollowsSelection`, and that `highlightIsCorrectedOnFilterChange` ensures
that there is still a highlighted item when the filter changes.

```
export class Filtering<ValueT = any> {
  @data isEnabled: boolean = false;
  @data filter: FilterT = (ValueT[]) => [];
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

const createContainer() {
  const ctr = {
    selection: new Selection(),
    highlight: new Highlight(),
    filtering: new Filtering()
  };

  setCallbacks(ctr.selection, {
    selectItem: {
      select(this: Selection_selectItem): {
        handleSelectItem(ctr.selection, this.selectionParams);
        highlightFollowsSelection(ctr, this.selectionParams);
      },
    }
  });

  setCallbacks(filtering, {
    apply: {
      exit() {
        highlightIsCorrectedOnFilterChange(ctr);
      },
    },
  });

  return ctr;
}
```

Notes:

- There are special callback functions called `enter` and `exit` that are called at the
  beginning and end of the operation function. An example of using the `exit` callback is shown
  above.

### Mapping data onto the container, and between facets

At this point we have a container with facets that perform useful operations, and that interact
to achieve interesting behaviours. However, we took a shortcut by hard coding the value of
`Selection.selectableIds`, and also we forgot to set the value of `Filtering.inputItems`. Skandha
comes with data mapping functions for this purpose. Let's extend the container with input
and output data structures:

```
const createContainer() {
  // we keep all the existing code that was added above

  ctr['inputs'] = {
    todoById: {[id: string]: TodoT} = loadTodos();
  };

  ctr['outputs'] = {
    filteredTodoById: {[id: string]: TodoT} = {};
  };

  registerFacets(ctr, { name: 'TodosCtr' });
  return ctr;
```

Note the call to `registerFacets`, which is needed for the data mapping functions that we are about to introduce.
As a first step, we need to connect `Filtering.inputItems` to `Inputs.todoById` and `Outputs.filteredTodoById`.
We can think of this as setting up a pipeline, where one of more source facet members are mapped onto a destination
facet member:

```
mapDataToFacet(
  ['filtering', 'inputItems'],
  getm(['inputs', 'todoById']),
  (x: TodoByIdT) => Object.values(x)
)(ctr);

const listToItemById = items => items.reduce((acc: any, x: TodoT) => ({ ...acc, [x.id]: x }), {})

mapDataToFacet(
  ['outputs', 'filteredTodoById'],
  getm(['filtering', 'filteredItems']),
  listToItemById,
)(ctr);
```

Notes:

- the first argument to `mapDataToFacet` is a reference to the the facet member that receives the data. SkandhaJS will patch the
  facet, which - in the above example - means replacing the `inputItems` of `ctr.filtering` with a `get inputItems()` property.
- the second argument to `mapDataToFacet` is a getter function that takes the container and returns some data.
  In this case, it uses the `getm` helper function to return `ctr.inputs.todoById`.
- the third argument is a transformation that is applied to the result of the getter function. In this case,
  it means that `get inputItems()` returns `Object.values(getm(Inputs, 'todoById')(ctr))`.
- in the calls to `mapDataToFacet`, we have to be careful to correctly spell the facet member names, such as 'filtering'.
  It's also possible to use a class instead of a member name. For example, we could replace `['filtering', 'inputItems']` with
  `[Filtering, 'inputItems']`.

As the next step, we will connect the list of filtered items to `Selection.selectableIds` (so that selection
happens in the filtered list). In addition, we will add datamappings for `Selection.items`
and `Highlight.item` (these data mappings allow us to not only access the ids, but also the items themselves):

```
mapDataToFacet(
  ['selection', 'selectableIds'],
  getm(['outputs', 'filteredTodoById']),
  (x: TodoByIdT) => Object.keys(x)
)(ctr);

mapDatasToFacet(
  ['selection', 'items'],
  [
    getm(['selections', 'ids']),
    getm(['inputs', 'todoById']),
  ],
  (ids: string[], todoById: TodoByIdT) => ids.map((id) => todoById[id])
)(ctr);

mapDatasToFacet(
  [Highlight, 'item'],
  [
    getm([Highlight, 'id']),
    getm([Inputs, 'todoById']),
  ],
  (id: string, todoById: TodoByIdT) => todoById[id]
)(ctr);
```

We are done: the facets in the container are connected. Note that if we put these mapping policies in a reusable
library then we can shorten the code to the following:

```
const filteredTodoById = ['outputs', 'filteredTodoById'];
const inputTodoById = ['inputs', 'todoById'];
const filteredItems = ['filtering', 'filteredItems'];

const policies = [
  // selection
  selectionUsesSelectableIds(filteredTodoById, Object.keys),
  selectionUsesItemLookUpTable(inputTodoById),

  // highlighting
  highlightUsesItemLookUpTable(inputTodoById),

  // filtering
  filteringUsesInputItems(inputTodoById, Object.values),
  mapDataToFacet(filteredTodoById, getm(filteredItems), listToItemById),
]

installPolicies<TodosCtr>(policies, ctr);
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
It has a `registerCtr` function that turns each `@data` member into a Mobx property that is
either observable or computed (this function call replaces the call to `registerFacets`):

```
registerCtr({
  ctr: ctr,
  details: {
    name: 'TodosCtr',
  },
});
```

This means that by decorating your render function with `observer` you will get a re-render for any changes
(in observable facet members) in the container.

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
