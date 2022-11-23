# SkandhaJS

## Rationale

The goal of SkandhaJS is to provide data containers that have reusable behaviors, such as selection, highlighting, filtering, drag-and-drop, etc. The only requirement for using these containers is that every item in the container has a unique id. SkandhaJS allows you to combine behaviors that have interactions.

As a brief illustration, consider the example of selecting a todo in a list of todos. We'll assume the application has a state that stores a list of todos, associated selection data (`todoSelection`) and associated highlight data (`todoHighlight`):

1. When the user clicks on a todo in a todo-list, the list component calls `todoSelection.selectItem(todo.id, shift, ctrl)`.
2. The `aspiration` library intercepts the call in order to prepare a so-called `callbackMap`. To do its work of updating the selection data, the `todoSelection.selectItem` can use any of the callbacks in this map.
3. When a callback is executed, then the callback function can look up and change related data. For example, the `select` callback can change `todoHighlight` so that the selected todo is also highlighted.

## Links

- The [skandha](http://github.com/mnieber/skandha) library contains the basic building blocks
- The [skandha-facets](http://github.com/mnieber/skandha-facets) library contains useful facets such as selection, highlight, filtering, addition, etc.
- The [skandha-mobx](http://github.com/mnieber/skandha-mobx) library contains bindings to MobX
- The [aspiration](http://github.com/mnieber/aspiration) library handles aspect oriented programming (AOP)
- The [example code](http://github.com/mnieber/skandha-sample-app) shown in this README.

## Glossary (conceptual)

- callback function: a function that is called by an operation to help implement that operation
- callbackMap object: a collection of callback functions that is used by an operation.
- container: an object that contains data and facets. Typically, these facets are made to work together using callback functions.
- facet: a class that implements a reusable behaviour, such as selection.
- operation: a member function of a facet that changes the data of that facet.

## Glossary (technical)

- aspiration: a library that implements a form of Aspect Oriented Programming using callback functions.
- mapDataToProps: a helper function that maps data from one object to another. It's used to map data between facets.
- registerCtr: the function that tells SkandhaJS which containers and facets exist.
- setCallbackMap: the function that installs the callbackMap objects that are used by a facet.

## Example: a Selection facet

In Skandha, a behaviour such as selection is implemented in a "facet" class. The purpose of the selection facet is to store (and manipulate) the meta-data related to selection. Related facets (e.g. selection, highlighting and filtering) are stored in a container, together with the data that they describe.

There are two ways in which facets help you to write generic code:

1. They can be used in any container, regardless of what data-type is stored in the container.
2. They allow you to handle user-interaction in UI components in a uniform way. All UI components that receive a selection facet will use the same interface to make a selection (and in theory the component can remain agnostic of the data-type of the selected items).

In this example, we will show a simplified Selection facet class.

```
// file: Selection.ts
import { input, output, operation } from 'skandha';
import { host, stub } from 'aspiration';
import { Selection_selectItem, SelectionParamsT } from 'SelectionCbs';

export class Selection<ValueT = any> {
  static className = () => 'Selection';

  @input selectableIds: Array<string> = stub();
  @output ids: Array<string> = [];
  @output anchorId?: string;
  @output items: Array<ValueT> = stub();

  @operation @host(['selectionParams']) selectItem(
    selectionParams: SelectionParamsT
  ) {
    const cbs = getCallbacks<Selection_selectItem>(this);
    cbs.select();
  }
}
```

```
// file: SelectionCbs.ts
import { stub } from 'aspiration';

export type SelectionParamsT = { itemId?: string; isShift?: boolean; isCtrl?: boolean; };

export class Selection_selectItem extends Cbs {
  selectionParams: SelectionParamsT = stub();
  select() {}
}
```

## Facets have @input, @data and @output members

In `Selection.ts` we see the Selection facet class. It has a `selectableIds` field that stores the list of ids from which we can select. It is marked with the `@input` decorator because this field stores an input. The `ids`, `anchorId` and `items` fields are marked as `@output` fields. They are used to store the result of calling `selectItem()`. Fields that are decorated with `@data` are used both as output and input.

## Operations are decorated with `@operation`.

The `Selection` facet has a `selectItem()` operation that allows you to select from the selectable ids. It stores its results in the `ids`, `anchorId` and `items` fields.
As the comment mentions, `selectItem()` calls a callback function to do the actual work. This design leaves the selection method (e.g. what should happen if shift is pressed?) up to the client, which makes it possible to support different use-cases flexibly.

## Operations are logged

As a side effect of calling an operation, the entire container is logged to the console (if logging is enabled); this includes the Selection facet, and any other facets that the container may have (such as filtering, or highlight). The log message contains all @input, @data and @output fields of all facets in the container.

## The `@host` decorator is used to enable callbacks in an operation.

The `@host` decorator comes from the `Aspiration` library. When you call a function `f` that is decorated with `@host` then the following happens:

- Aspiration looks up the callbackMap object (that was installed with `setCallbackMap()`) for the given operation;
- it copies the operation arguments to the callbackMap object, so that callback functions can access these arguments;
- if calls `f(arguments)`;
- it restores the callbackMap object to its previous state. This ensures that nested calls work correctly.

If the original function `f` wants to access the callbackMap object then it uses the `getCallbacks` helper function. Note that the client code calls `f` in the usual way; it remains agnostic of the fact that callbacks are used to help implement `f`.

## Callback functions have access to all operation arguments

Each callback function of the callbackMap object has access to all arguments of the operation. For this to work, it's required that you pass the list of argument names to the `@host` decorator (unfortunately, typescript does not have introspection capabilities that allow to automate this). These names need to match the corresponding fields of the callbackMap class. In our example, the argument of the `selectItem` operation is named `selectionParams`. A field with the same name exists in the `Selection_selectItem` class that stores the callbackMap. The name `selectItem` is passed to the `@host` decorator so that `aspiration` knows that the `selectItem` argument must be copied to the `Selection_selectItem` callbackMap.

## Facets have a static `className()` function

To allow SkandhaJS to log the container, you need to add the `className()` function to each facet class, so that Skandha knows the name of the facet.

## Example: a container with Selection, Highlight and Filtering

Now that we have some idea of what a facet is, we will discuss containers.
In this example we will take a look at a todos container. It uses the `Selection` facet that we saw earlier (and some other facets that we haven't defined yet). Note that in this example, we're not yet storing any data in the container (this will come later).

```
// file: createContainer.ts
import { Selection_selectItem } from 'SelectionCbs';
import * as R from 'ramda';

const createContainer() {
  const todosCtr = {
    selection: new Selection(),
    highlight: new Highlight(),
    filtering: new Filtering()
  };

  setCallbackMap(todosCtr.selection, {
    selectItem: {
      select(this: Selection_selectItem): {
        handleSelectItem(todosCtr.selection, this.selectionParams);
        highlightFollowsSelection(todosCtr, this.selectionParams);
      },
    }
  });

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

## Note: the todos container has selection, highlight and filtering

In `createContainer.ts` we see how `createContainer()` creates a `todosCtr` object that has three facets: selection, highlight and filtering. After creating the container, the `installCallbacks()` function is called to determine how the facet operations are implemented. In this case, we only install the `select()` callback function.

## Callbacks are installed with `setCallbackMap()`

We call `setCallbackMap()` to install a callbackMap object for each operation of the `Selection` facet. In our case we only have one operation (`selectItem()`) that has only one callback (`select()`). This callback function calls `handleSelectItem()` to take care of doing the selection. This is a typical pattern: you want the call to `setCallbackMap()` to be as short and readable as possible, so that it's easy to understand what happens in each operation of each facet.

## Callbacks can take care of side effects

An important advantage of using callbacks is that they can also take care of side effects. In this case, it calls `highlightFollowsSelection()` to ensure that selected items are also highlighted. Note that the callback function is able to connect selection and highlight because it has access to the entire container.

## The callback function can access the callbackMap object through `this`.

When the clients calls `todosCtr.selection.selectItem()` and `select()` is called back, then all arguments of the operation are available through `this`. In our case, we see that the `select()` callback function is accessing `this.selectionParams`.

## The `exit()` callback function is called at the end of an operation

In `createContainer.ts` we also have a `Filtering` facet that has an `apply(f)` operation (where `f` is the filter function). In this operation, we install the `exit()` callback that corrects the highlight when the filter function changes (because the new filter may hide the highlighted item). The `exit()` callback is called automatically at the end of each operation. Similarly, the `enter()` callback is called automatically at the beginning.

## The `registerCtr()` allows SkandhaJS to introspect the container

At the end of `createContainer.ts` we call `registerCtr()` so that SkandhaJS can introspect the container. This is necessary for two reasons. First, it makes it possible to look up a facet by its name or class, e.g. `getf(todosCtr, Selection)` returns `todosCtr.selection`. Second, it informs SkandhaJS how to log all facets of the container.

## Example: `mapDataToProps()` maps data onto each facet

We've seen how facets are implemented, and how they can be added to a container in a way that allows us to create interactions between them. Since our container contains selection and filtering, we should only allow selection of todos that have not been filtered out. In other words, the list of selectable ids should be derived from the list of filtered todos. In this example, we will see how we can create such a mapping from the filtering facet to the selection facet. Moreover, we will add code to load the todos and set them as the inputs of the filtering facet.

```
// file: createContainer.ts
import * from 'ramda' as R;
import { mapDataToProps, pmap } from 'skandha';

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

  mapDataToProps(
    pmap(
      [todosCtr.filtering, 'inputItems'],
      () => todosCtr.data.todos
    ),
    pmap(
      [todosCtr.data, 'filteredTodos'],
      () => todosCtr.filtering.filteredItems
    ),
    pmap(
      [todosCtr.selection, 'selectableIds'],
      () => R.map(R.prop('id'), todosCtr.data.filteredTodos)
    ),
    pmap(
      [todosCtr.selection, 'items'],
      () => R.map(getTodoById, todosCtr.selection.ids)
    ),
    pmap(
      [todosCtr.highlight, 'item'],
      () => getTodoById(todosCtr.highlight.id)
    ),
  )
}

setOptions({logging: true});
```

## The `mapDataToProps()` function maps data between objects

The `mapDataToProp()` function takes a container, field name and function and installs a `get` property (on the given container, using the given field name) that executes the given function. The `mapDataToProps()` is a small convenience function that calls `mapDataToProp()` on each of its arguments. In our example, we see that the `todosCtr.data.todos` field is mapped onto the `todosCtr.filtering.inputItems` field.

## The `pmap()` function adds type-checking

The `pmap()` function takes two arguments. The first argument is an array that has a container and a container-member. The second argument is a function. The `pmap` function checks that the output of this function can be stored in the container-member (if not, then a compile-time error results). It returns an array that contains its two arguments (because that is the format that `mapDataToProps` expects). As you can see, `pmap` does not do any useful work at run-time, but it adds type-checking at compile-time.

## Logging can be enabled using `setOptions()`

By calling `setOptions({logging: true})`, the SkandhaJS library allows you to inspect each facet before and after calling an operation. All facet members that are decorated with `@data` (or `@input`, or `@output`) are logged in a way that looks similar to what you are used to from Redux:

- before and after each operation, the entire container that holds the facet is logged
- all data members of each facet in the container are included in the log
- log entries are nested so that you can see how operation calls are nested

## The `registerCtr()` function from facets-mobx makes facets observable

If you want to render the facets with React then we need to let React know when data changes. The [skandha-mobx](http://github.com/mnieber/skandha-mobx) library was created for this purpose. It has a `registerCtr()` function that can be used instead of the default one from `skandha`. This replacement version of `registerCtr()` function turns each `@data` member into a Mobx property that is either observable or computed.

## Conclusion

SkandhaJS introduces a lot of new patterns and ideas (that are of course not in fact new) to allow you to
put reusable behaviours on top of your existing data-structures. The difference to a more standard approach
can feel overwhelming, but it's important to point out the beneficial side effect of
separating concerns in a clear and understandable way. We could add a `Editing` facet to our code and install
a policy that says that changing the highlight disables editing. By using facets, we will not be tempted to put
editing-specific code directly in the highlight function (that would obviously be mixing concerns).

In my experience, using SkandhaJS leads to code reuse and improved structure. On top of that, it offers a good debugging experience by logging all changes in the container. Finally, it works nicely with MobX to render the container contents.
