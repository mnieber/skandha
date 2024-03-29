# SkandhaJS

## Introduction

SkandhaJS is a library that provides data containers with generic (reusable) behaviors, or "facets," that are implemented as classes. Examples of facets are selection, highlighting, filtering, drag-and-drop, etc. These facets provide interfaces for specific behaviors and rely on callback functions provided by the programmer to specify the details of those behaviors. The goal of SkandhaJS is to provide a way to create interactions between different behaviors in a consistent and modular way.

As a brief illustration, consider the example of selecting a todo in a list of todos:

1. The application has a local state with a list of todos. The state contains a `todoSelection` facet so that clients can make a selection.
2. When the user clicks on a todo, the todo-list component calls `todoSelection.selectItem({id: todo.id, shift, ctrl})`.
3. The `todoSelection.selectItem` function runs the `select` function from its `callbackMap`.
4. The `select` callback performs the selection and a side-effect: it highlights the item as well.

## Benefits

There are three ways in which facets help you to write reusable code:

1. They can be reused in any container, regardless of what data-type is stored in the container. This means that selection, filtering and drag-and-drop work the same everywhere in the application.
2. They allow you to capture the interaction between behaviours in reusable functions.
3. They allow you to handle user-interaction in UI components in a uniform way. All UI components that receive a selection facet will use the same interface to make a selection (and in theory the component can remain agnostic of how selection works, or even of the type of the items that are being selected).

## Links

- The [skandha](http://github.com/mnieber/skandha) library contains the basic building blocks
- The [skandha-facets](http://github.com/mnieber/skandha-facets) library contains useful facets such as selection, highlight, filtering, addition, etc.
- The [skandha-mobx](http://github.com/mnieber/skandha-mobx) library contains bindings to MobX
- The [aspiration](http://github.com/mnieber/aspiration) library handles aspect oriented programming (AOP)
- The [example code](http://github.com/mnieber/skandha-sample-app) shown in this README.

## Glossary (conceptual)

- callback function: a function that is called by an operation to help implement that operation
- callbacks object: a collection of callback functions that is used by an operation.
- callbackMap: a dictionary that contains a callbacks object for every operation of a facet
- container: an object that contains data and facets. Typically, these facets are made to work together using callback functions.
- facet: a class that implements a generic behaviour, such as selection.
- operation: a member function of a facet that changes the data of that facet.

## Glossary (technical)

- aspiration: a library that implements a form of Aspect Oriented Programming using callback functions.
- mapDataToProps: a helper function that maps data from one object to another. It's used to map data between facets.
- registerCtr: the function that tells SkandhaJS which containers and facets exist.
- setCallbackMap: the function that installs the callbackMap for a facet.

## Example: a Selection facet

In Skandha, a behaviour such as selection is implemented in a "facet" class. The purpose of the selection facet is to store (and manipulate) the selection state. In this example, we will show a simplified `Selection` facet class.

```
// file: Selection.ts
import { input, output, operation } from 'skandha';
import { DefineCbs, getCallbacks, withCbs, stub } from 'aspiration';

export class Selection<ValueT = any> {
  static className = () => 'Selection';

  @input selectableIds: Array<string> = stub();
  @output ids: Array<string> = [];
  @output anchorId?: string;
  @output items: Array<ValueT> = stub();

  @operation @withCbs() selectItem(args: SelectionParamsT) {
    const cbs = getCallbacks(this) as SelectionCbs['selectItem'];
    cbs.select();
  }
}

type Cbs<T> = {
  selectItem: {
    selectItem(): void;
  };
};

export type SelectionCbs<T = any> = DefineCbs<Selection<T>, Cbs<T>>;
```

## Facets have @input, @data and @output members

In `Selection.ts` we see the `Selection` facet class. It has a `selectableIds` field that stores the list of ids from which we can select. The `@input` decorator marks this field as an input. The `ids`, `anchorId` and `items` fields store the result of calling `selectItem()` and are marked as `@output` fields. Fields that are decorated with `@data` are used both as output and input. These decorators help with logging, and they also make it possible to bind the facets to state-management solutions such as MobX (this is explained later).

## Operations are decorated with `@operation`.

The `Selection` facet has a `selectItem()` operation that allows you to select from the selectable ids. It stores its results in the `ids`, `anchorId` and `items` fields. As the comment mentions, `selectItem()` calls a callback function to do the actual work. This design leaves the selection method (e.g. what should happen if shift is pressed?) up to the client, which makes it possible to support different use-cases flexibly.

## Operations are logged

As a side effect of calling an operation, the entire container is logged to the console (if logging is enabled); this includes the `Selection` facet, and any other facets that the container may have (such as filtering, or highlight). The log message contains all `@input`, `@data` and `@output` fields of all facets in the container.

## The `@withCbs` decorator is used to enable callbacks in an operation.

The `@withCbs` decorator comes from the `Aspiration` library. When you call a function `f` that is decorated with `@withCbs` then the following happens:

- Aspiration looks up the callbacks object (that was installed with `setCallbackMap()`) for the given operation;
- It copies the operation arguments to the callbacks object, so that callback functions can access these arguments;
- It calls `f(arguments)`, which internally will use the installed callback functions to do its job;
- It restores the callbacks object to its previous state. This ensures that nested calls work correctly.

If the original function `f` wants to access the callbacks object then it uses the `getCallbacks` helper function. Note that the client code calls `f` in the usual way; it remains agnostic of the fact that callbacks are used to help implement `f`.

## Facets have a static `className()` function

To allow SkandhaJS to log the container, you need to add the `className()` function to each facet class, so that Skandha knows the name of the facet. The `className()` function is also used to look up facets in containers with the `getf` function (e.g. `getf(Selection, ctr)` returns the selection facet in `ctr`).

Note that if you subclass a facet class then you should (in most cases) not override the `className()`. By keeping the original `className()` function, you will be able to replace facets with their subclassed versions without affecting the facet lookup mechanism. However, if you subclass the facet then you must add the `skandhaSymbol` member, as explained below.

## Facets that use inheritance must have a static `skandhaSymbol` member

Skandha will store class-level information about a facet class in the class itself. If you subclass a facet class then you must add a `skandhaSymbol` member so that Skandha will keep the information for the subclass separate from the information for the parent class:

```
// file: Selection.ts
import { Selection } from 'skandha-facets';

export class MySelection extends Selection {
  static className = () => 'Selection';
  static skandhaSymbol = Symbol('MySelection');
}
```

## Example: a container with Selection, Highlight and Filtering

Now that we have some idea of what a facet is, we will discuss containers.
In this example we will take a look at a todos container. It uses the `Selection` facet that we saw earlier (and some other facets that we haven't defined yet). Note that in this example, we're not yet storing any data in the container (this will come later).

```
// file: createContainer.ts
import { SelectionCbs } from 'SelectionCbs';
import * as R from 'ramda';

const createContainer() {
  const todosCtr = {
    selection: new Selection(),
    highlight: new Highlight(),
    filtering: new Filtering()
  };

  setCallbackMap(todosCtr.selection, {
    selectItem: {
      select(this: SelectionCbs['selectItem']): {
        handleSelectItem(todosCtr.selection, this.args);
        highlightFollowsSelection(todosCtr, this.args);
      },
    }
  });

  setCallbackMap(todosCtr.highlight, {});

  setCallbackMap(todosCtr.filtering, {
    apply: {
      exit() {
        highlightIsCorrectedOnFilterChange(todosCtr);
      },
    },
  });

  registerCtr({ ctr: todosCtr, options: { name: 'Todos'} });
  return todosCtr;
}
```

```
// file: highlightFollowsSelection.ts
const highlightFollowsSelection = (ctr: any, selectionParams: SelectionParamsT) => {
  if (!selectionParams.isShift && !selectionParams.isCtrl) {
    ctr.highlight.highlightItem(selectionParams.itemId);
  }
}
```

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

## Callbacks are installed with `setCallbackMap()`

We call `setCallbackMap()` to install a callbackMap object for each operation of the `Selection` facet. In our case we only have one operation (`selectItem()`) that has only one callback (`select()`). This callback function calls `handleSelectItem()` to take care of doing the selection. This is a typical pattern: you want the call to `setCallbackMap()` to be as short and readable as possible, so that it's easy to understand what happens in each operation of each facet.

## The callback function can access the callbackMap object through `this`.

When the clients calls `todosCtr.selection.selectItem()` and `select()` is called back, then all arguments of the `selectItem` operation are available through `this`. In our case, we see that the `select()` callback function is accessing `this.args`. See the `aspiration` library documentation for details.

## Callbacks can take care of side effects

An important advantage of using callbacks is that they can also take care of side effects. In this case, it calls `highlightFollowsSelection()` to ensure that selected items are also highlighted. Note that the callback function is able to connect selection and highlight because it has access to the entire container. Keeping the code of `setCallbackMap()` short also helps the reader to understand which interactions take place. This is vital, because we are purposely mixing concerns in this part of the code, which means that there is a higher risk of confusing the reader.

## The `exit()` callback function is called at the end of an operation

In `createContainer.ts` we also have a `Filtering` facet that has an `apply(f)` operation (where `f` is the filter function). In this operation, we install the `exit()` callback that corrects the highlight when the filter function changes (because the new filter may hide the highlighted item). The `exit()` callback is called automatically at the end of each operation. Similarly, the `enter()` callback is called automatically at the beginning.

## The `registerCtr()` allows SkandhaJS to introspect the container

At the end of `createContainer.ts` we call `registerCtr()` so that SkandhaJS can introspect the container. This is necessary for two reasons. First, it makes it possible to look up a facet by its name or class, e.g. `getf(Selection, todosCtr)` returns `todosCtr.selection`. Second, it informs SkandhaJS how to log all facets of the container.

## Example: `mapDataToProps()` maps data onto each facet

We've seen how facets are implemented, and how they can be added to a container in a way that allows us to create interactions between them. The next step is to map data between facets. Such mappings are necessary when the input data for one facet is based on the output data of another facet. For example, we should only allow selection of todos that have not been filtered out. In this example, we will see how we can create such a mapping. Moreover, we will add code to load the todos and set them as the inputs of the filtering facet.

```
// file: createContainer.ts
import * from 'ramda' as R;
import { mapDataToProps } from 'skandha';

class TodosData {
  static className = () => 'Inputs';

  @data todos: TodoT[] = [];
  @data filteredTodos: TodoT[] = [];

  @data get todoById() {
    return R.indexBy(R.prop('id'), todosCtr);
  }
}

const createContainer = () => {
  const todosCtr = {
    data: new TodosData(),
    selection: new Selection(),
    highlight: new Highlight(),
    filtering: new Filtering(),
  }
  todosCtr.data.todos = loadTodos();
  const getTodoById = (id?: string) => id ? todosCtr.data.todoById[id] : undefined;

  mapDataToProps(todosCtr,
    filtering: {
      inputItems: () => todosCtr.data.todos,
      filteredItems: () => todosCtr.filtering.filteredItems,
    },
    selection: {
      selectableIds: () => R.map(R.prop('id'), todosCtr.data.filteredTodos),
      items: () => R.map(getTodoById, todosCtr.selection.ids),
    },
    highlight: {
      item: () => getTodoById(todosCtr.highlight.id)
    }
  )
}

setOptions({logging: true});
```

## The `mapDataToProps()` function maps data between objects

The `mapDataToProp()` function takes a container, field name and function and installs a `get` property (on the given container, using the given field name) that executes the given function. In our example, we see that the `todosCtr.data.todos` field is mapped onto the `todosCtr.filtering.inputItems` field.

## Logging can be enabled using `setOptions()`

If you call `setOptions({logging: true})` then the SkandhaJS library logs each facet before and after each operation. All facet members that are decorated with `@data` (or `@input`, or `@output`) are logged in a way similar to Redux:

- before and after each operation, the entire container that holds the facet is logged
- all data members of each facet in the container are included in the log
- log entries are nested so that you can see how operation calls are nested

## The `registerCtr()` function from facets-mobx makes facets observable

If you want to render the facets with React then we need to let React know when data changes. The [skandha-mobx](http://github.com/mnieber/skandha-mobx) library was created for this purpose. It has a `registerCtr()` function that can be used instead of the default one from `skandha`. This drop-in replacement version of the normal `registerCtr()` function turns each `@data` member into a Mobx property that is either observable or computed.

## Conclusion

SkandhaJS introduces a lot of new patterns and ideas (that are of course not in fact new) to allow you to
put generic behaviours on top of your existing data-structures. The difference to a more standard approach
can feel overwhelming, but it's important to point out the beneficial side effect of
separating concerns in a clear and understandable way. We could add a `Editing` facet to our code and install
a policy that says that changing the highlight disables editing. By using facets, we will not be tempted to put
editing-specific code directly in the highlight function (that would obviously be mixing concerns).

In my experience, using SkandhaJS leads to code reuse and improved structure. On top of that, it offers a good debugging experience by logging all changes in the container. Finally, it works nicely with MobX to render the container contents.
