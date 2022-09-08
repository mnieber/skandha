# SkandhaJS

## Rationale

The goal of SkandhaJS is to provide data containers that have reusable behaviors, such as selection, highlighting, filtering, drag-and-drop, etc. The only requirement for using these containers is that every item in the container has a unique id. SkandhaJS allows you to combine behaviors and make them interact properly. For example, when selecting an item you may want the item also to be highlighted. As we will see, these interactions are achieved by implementing callback functions.

## Links

- The [skandha](http://github.com/mnieber/skandha) library contains the basic building blocks
- The [skandha-facets](http://github.com/mnieber/skandha-facets) library contains useful facets such as selection, highlight, filtering, addition, etc.
- The [skandha-mobx](http://github.com/mnieber/skandha-mobx) library contains bindings to MobX
- The [aspiration](http://github.com/mnieber/aspiration) library handles aspect oriented programming (AOP)
- The [example code](http://github.com/mnieber/skandha-sample-app) shown in this README.

## Glossary (conceptual)

- callbacks object: a collection of callback functions that is used by an operation.
- container: a class that contains multiple facets.
- facet: a class that implements a reusable behaviour, such as selection.
- operation: a member function of a facet that changes the data of that facet.

## Glossary (technical)

- aspiration: a library that implements a form of Aspect Oriented Programming using callback functions.
- registerCtr: the function that tells SkandhaJS which containers and facets exist.
- setCallbacks: the function that installs the callbacks objects that are used by a facet.

## Snippet: a Selection facet.

```
// file: Selection.ts
import { input, output, operation } from 'skandha';
import { host, stub } from 'aspiration';

export type SelectionParamsT = { itemId?: string; isShift?: boolean; isCtrl?: boolean; };

export class Selection<ValueT = any> {
  static className = () => 'Selection';

  @input selectableIds: Array<string> = stub();
  @output ids: Array<string> = [];
  @output anchorId?: string;
  @output items: Array<ValueT> = stub();

  @operation @host(['selectionParams']) selectItem(
    selectionParams: SelectionParamsT
  ) {
    return (cbs: Selection_selectItem) => {
      cbs.select();
    };
  }
}
```

```
// file: SelectionCbs.ts
export class Selection_selectItem extends Cbs {
  selectionParams: SelectionParamsT = stub();
  select() {}
}
```

## Fact: the Selection facet has input, data and output members

In `Selection.ts` we see a so-called facet class. A facet class implements a reusable behaviour, such as selection.
The `Selection` facet stores a list of selectable ids and has a `selectItem` operation that allows you to select from those ids. The selection result is stored in the `ids`, `anchorId` and `items` fields.

## Fact: the `@operation` decorator is used to declare the `selectItem` operation.

The main purpose of the `@operation` decorator is to enable logging of the entire facet before and after the operation.

## Fact: the `@host` decorator is used to enable callbacks in an operation.

The `@host` decorator comes from the `aspiration` library and makes it possible to install a callbacks object (using `setCallbacks`).
Note that the `selectItem` operation forwards all the work to the `cbs.selectItem()` callback function.
Every callback function will have access to all arguments of the operation. For this to work, it's required that you also pass the list of argument names to the `@host` decorator.

## Fact: the Selection facet has a static className function

Various facets (e.g. selection, highlight, filtering) are usually combined in a single container. To allow you to look up a facet by it's name, each facet class implements the static `className` function.

## Fact: a callbacks object defines a set of callbacks

In `SelectionCbs.ts` we see that `Selection_selectItem` defines the callbacks of the `selectItem` operation.
It also defines the parameters that are received by the operation. These parameters will be made available to each callback.

## Snippet: a container with one facet.

```
// file: createContainer.ts
import { registerCtr } from 'skandha';

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

  // If you omit `facets` then all fields of `ctr` are considered to be facets.
  registerCtr(ctr, { name: 'TodosCtr', facets: ['selection'] });
  return ctr;
}
```

## Fact: the setCallbacks function installs the callbacks

In `createContainer.ts` the `setCallbacks` function is called to install the `select` callback function. This callback function forwards to a helper function called `handleSelectItem`.
Note that the callbacks object is available through `this`.

## Fact: the registerCtr function registers the container with SkandhaJS

In `createContainer.ts` the purpose of calling registerCtr on the container is twofold:

- it makes it possible to look up a facet by its name or class, e.g. `getf(ctr, Selection)` returns `ctr.selection`.
- it tells SkandhaJS which facets should be included in log reports. When the client calls an operation then SkandhaJS will log the entire container before and after the operation was executed. Logging can be enabled using the `setOptions` function.

## Snippet: the handleSelectItem functon

```
// file: handleSelectItem.ts
export function handleSelectItem(
  facet: Selection,
  { itemId, isShift, isCtrl }: SelectionParamsT
) {
  if (itemId === undefined) {
    facet.ids = [];
    facet.anchorId = undefined;
    return;
  }

  if (isShift) {
    // Omitted for brevity
  } else if (isCtrl) {
    facet.ids = facet.ids.includes(itemId)
      ? facet.ids.filter((x) => x !== itemId)
      : [...facet.ids, itemId];
  } else {
    facet.ids = [itemId];
  }

  // Move the anchor
  if (!facet.anchorId || !(isCtrl || isShift)) {
    facet.anchorId = itemId;
  }
}
```

## Fact: the handleSelectItem does the actual work of selecting items

For completeness, we show how `handleSelectItem` is implemented. Note that this function stores the results directly in the selection facet instance.

## Snippet: the Highlight facet

```
// file: Highlight.ts
export class Highlight_highlightItem extends Cbs {
  id: string = stub();
  scrollItemIntoView() {}
}

export class Highlight<ValueT = any> {
  @data id?: string;
  @data item?: ValueT;

  @operation @host(["id"]) highlightItem(id: string) {
    return (cbs: Highlight_highlightItem) => {
      this.id = id;
      if (cbs.scrollItemIntoView) {
        cbs.scrollItemIntoView();
      }
    };
  }
}
```

## Fact: the `Highlight` facet implements the highlight behaviour

The `Highlight` snippet has a similar structure as the `Selection` facet.
It has a callback function for scrolling the highlighted item into view.
Note that the `highlightItem` operation does not set the `item` field, because the facet only deals with ids. We shall later see how the `Connector` class is used to look up the `item` field in an external collection.

## Snippet: a container with Selection and Highlight

```
// file: createContainer.ts
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

        // The above 3 lines could be extracted in a reusable helper function, e.g.
        // highlightFollowsSelection(ctr, this.selectionParams);
      },
    }
  });

  return ctr;
```

## Fact: callbacks allow you to create co-ordinated behaviours

In `createContainer.ts` we see for the first time how SkandhaJS helps you to create co-ordinated behaviours. When the client calls `ctr.selection.selectItem` and the `select` callback is executed, then the callback ensures that the selected item is also highlighted.
As the comment in the snippet suggests, we could make the body of the `select` callback more readable by extracting some of the code in a `highlightFollowsSelection` helper function.

## Snippet: a container with Selection, Highlight and Filtering

```
// file: createContainer.ts
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

## Fact: the `exit` callback function is called at the end of the operation

In `createContainer.ts` we add a filtering facet that has an `apply` operation.
In this operation, we can install an `exit` callback that corrects the highlight when the filter changes (because the filter may hide the highlighted item). The `exit` callback is called at the end of the operation. Similarly, the `enter` callback is called at the beginning.

## Snippet: a Connector maps data onto each facet

```
// file: createContainer.ts
import * from 'ramda' as R;

const connectContainer(ctr: any) {
  const inputs = { todos: loadTodos() };
  const outputs = { filteredTodoById: {} };

  const con = createConnector({
    selection: () => ctr.selection,
    highlight: () => ctr.highlight,
    filtering: () => ctr.filtering`,
    inputs: () => inputs,
    outputs: () => outputs,
  });

  const lookUpTodo = (id: string) => outputs.filteredTodoById[id];

  con.filtering.inputItems = con.inputs.todos;
  con.outputs.filteredTodoById = con.filtering.filteredItems.tf(R.indexBy('id));
  con.selection.selectableIds = con.outputs.filteredTodoById.tf(R.keys);
  con.selection.item = con.selection.ids.tf(lookUpTodos);
  con.highlight.item = con.highlight.id.tf(lookUpTodo);

  con.connect();
```

## Fact: the Connector class maps data between objects

The Connector instance allows you to map data from one object onto another object.
In our example, the `inputs.todos` field is mapped onto the `filtering.inputItems` field. This means that `Connector` turns `filtering.inputItems` into a `get` property that returns `filtering.inputItems`.

## Fact: there are three steps involved when using the Connector

In the first step we declare the objects and their getter functions. In our case, we want to map data between facets, which means that our objects are `selection`, `filtering`, etc.
In the second step, we declare relations between the different fields of these objects. In this step, we can also declare one or more transformation functions (such as `lookUpTodo`) that should be used in the mapping.
In the final step, we call `con.connect` to create the `get` properties that perform the declared mappings.

### Logging

By calling `setOptions({logging: true})`, the SkandhaJS library allows you to inspect each facet before and after calling an operation.
All facet members that are decorated with `@data` (or `@input`, or `@output`) are logged in a way that looks similar to what you are used to from Redux:

- before and after each operation, the entire container that holds the facet is logged
- all data members of each facet in the container are included in the log
- log entries are nested so that you can see how operation calls are nested

### Making facets observable with Mobx

If you want to render the facets with React then we need to let React know when data changes. The [skandha-mobx](http://github.com/mnieber/skandha-mobx) library was created for this purpose. It has a `registerCtr` function that turns each `@data` member into a Mobx property that is
either observable or computed:

```
registerCtr({
  ctr: ctr,
  options: { name: 'TodosCtr'},
});
```

## Conclusion

SkandhaJS introduces a lot of new patterns and ideas (that are of course not in fact new) to allow you to
put reusable behaviours on top of your existing data-structures. The difference to a more standard approach
can feel overwhelming, but it's important to point out the beneficial side effect of
separating concerns in a clear and understandable way. We could add a `Editing` facet to our code and install
a policy that says that changing the highlight disables editing. By using facets, we will not be tempted to put
editing-specific code directly in the highlight function (that would obviously be mixing concerns).

In my experience, using SkandhaJS leads to code reuse and improved structure. On top of that, it offers a good
debugging experience by logging all changes in the container. Finally, it works nicely with MobX to render the container contents.
