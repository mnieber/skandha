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

- callback function: a function that is called by an operation to help implement that operation
- callbacks object: a collection of callback functions that is used by an operation.
- container: a class that contains multiple facets. Typically, these facets are made to work together using callback functions.
- facet: a class that implements a reusable behaviour, such as selection.
- operation: a member function of a facet that changes the data of that facet.

## Glossary (technical)

- aspiration: a library that implements a form of Aspect Oriented Programming using callback functions.
- mapDataToProps: a helper function that maps data from one object to another. It's also used to map data between facets.
- registerCtr: the function that tells SkandhaJS which containers and facets exist.
- setCallbacks: the function that installs the callbacks objects that are used by a facet.

## Example: a simplified Selection facet

In Skandha, behaviours (such as selection, or filtering) are implemented in so-called facets that live in containers. For example, a todo container may have facets for selecting, highlighting and filtering todos. Because facets are reusable, they can also be used in other containers. And because facets are abstractions, you can use them to create UI components that handle selection in any container. In this example, we will show a simplified Selection facet class.

```
// file: Selection.ts
import { input, output, operation } from 'skandha';

export type SelectionParamsT = { itemId?: string; isShift?: boolean; isCtrl?: boolean; };

export class Selection<ValueT = any> {
  static className = () => 'Selection';

  @input selectableIds: Array<string> = [];
  @output ids: Array<string> = [];
  @output anchorId?: string;
  @output items: Array<ValueT> = [];

  @operation selectItem(selectionParams: SelectionParamsT) {
    // This function calls a callback function to do the actual work.
    // Details about how this works are omitted for now.
  }
}
```

## Fact: facets have @input, @data and @output members

In `Selection.ts` we see the Selection facet class. It has a `selectableIds` field that stores the list of ids from which we can select. It is marked with the `@input` decorator because this field stores an input. The `ids`, `anchorId` and `items` fields are marked as `@output` fields. They are used to store the result of calling `selectItem()`. Fields that are decorated with `@data` are used both as output and input.

## Fact: operations are decorated with `@operation`.

The `Selection` facet has a `selectItem()` operation that allows you to select from the selectable ids. It stores its results in the `ids`, `anchorId` and `items` fields.
As the comment mentions, `selectItem()` calls a callback function to do the actual work. The reason is that the correct way to make a selection (e.g. what should happen if shift is pressed?) depends on the use-case. Therefore, we want to leave it up to the client to decide this.

## Fact: operations are logged

As a side effect of calling an operation, the entire container is logged to the console; this includes the Selection facet, and any other facets that the container may have (such as filtering, or highlight). The log message contains all @input, @data and @output fields of all facets in the container.

## Example: a container with Selection, Highlight and Filtering

Now that we have some idea of what a facet is, we will discuss containers.
In this example we will take a look at a todos container. It uses the `Selection` facet that we saw earlier (and some other facets that we haven't defined yet).

```
// file: createContainer.ts
import { Selection_selectItem } from 'SelectionCbs';

const createContainer() {
  const todosCtr = {
    selection: new Selection(),
    highlight: new Highlight(),
    filtering: new Filtering()
  };

  setCallbacks(todosCtr.selection, {
    selectItem: {
      select(this: Selection_selectItem): {
        handleSelectItem(todosCtr.selection, this.selectionParams);
        highlightFollowsSelection(todosCtr, this.selectionParams);
      },
    }
  });

  setCallbacks(todosCtr.filtering, {
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

## Fact: callbacks are installed with `setCallbacks()`

We call `setCallbacks()` to install a callbacks object for each operation of the `Selection` facet. In our case we only have one operation (`selectItem()`) that has only one callback (`select()`). This callback function calls `handleSelectItem()` to take care of doing the selection. This is a typical pattern: you want the call to `setCallbacks()` to be as short and readable as possible, so that it's easy to understand what happens in each operation of each facet.

## Fact: callbacks can take care of side effects

An important advantage of using callbacks is that they can also take care of side effects. In this case, it calls `highlightFollowsSelection()` to ensure that selected items are also highlighted. Note that the callback function is able to connect selection and highlight because it has access to the entire container.

## Fact: the callback function can access the callbacks object through `this`.

When the clients calls `todosCtr.selection.selectItem()` and `select()` is called back, then all arguments of the operation are available through `this`. In our case, we see that the `select()` callback function is accessing `this.selectionParams`.

## Fact: the `exit()` callback function is called at the end of an operation

In `createContainer.ts` we also have a `Filtering` facet that has an `apply(f)` operation (where `f` is the filter function). In this operation, we install the `exit()` callback that corrects the highlight when the filter function changes (because the new filter may hide the highlighted item). The `exit()` callback is called automatically at the end of each operation. Similarly, the `enter()` callback is called at the beginning.

## Fact: the `registerCtr()` allows SkandhaJS to introspect the container

At the end of `createContainer.ts` we call `registerCtr()` so that SkandhaJS can introspect the container. This is necessary for two reasons. First, it makes it possible to look up a facet by its name or class, e.g. `getf(todosCtr, Selection)` returns `todosCtr.selection`. Second, it informs SkandhaJS how to log all facets of the container

## Example: a complete Selection facet

It's time now to return to the Selection facet and show how callbacks really work.

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
    return (cbs: Selection_selectItem) => {
      cbs.select();
    };
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

## Fact: the `@host` decorator is used to enable callbacks in an operation.

The `@host` decorator comes from the `Aspiration` library. When you call a function `f` that is decorated with `@host` then the following happens:

- Aspiration looks up the callbacks object for the operation (that was installed with `setCallbacks()`)
- it copies the operation arguments to the callbacks object (so that callback functions can access these arguments)
- if calls `f(arguments)(callbacksObject)`.

Remember that `f` is the original function. We see from the example that `f` returns a closure. This closure receives the callbacks object, but (because it's a closure) it also has access to the arguments of f. This approach allows the client code to call `f` in the usual way; it can be agnostic of the fact that callbacks are used to help implement `f`.

## Fact: callback functions have access to all operation arguments

As we mentioned earlier, each callback function of the callbacks object has access to all arguments of the operation. For this to work, it's required that you pass the list of argument names to the `@host` decorator (unfortunately, typescript does not have introspection capabilities that allow to automate this). These names need to match the corresponding fields of the callbacks object class (`Selection_selectItem`).

## Fact: facets have a static `className()` function

To allow SkandhaJS to introspect the container, you need to add the `className()` function to each facet class, so that Skandha knows the name of the facet.

## Example: `mapDataToProps()` maps data onto each facet

We've seen how facets are implemented, and how they can be added to a container in a way that allows us to create interactions between them. Since our container contains selection and filtering, we should only allow selection of todos that have not been filtered out. In other words, the list of selectable ids should be derived from the list of filtered todos. In this example, we will see how we can create such a mapping from the filtering facet to the selection facet. Moreover, we will add code to load the todos and set them as the inputs of the filtering facet.

```
// file: createContainer.ts
import * from 'ramda' as R;
import { mapDataToProps } from 'skandha';

const createContainer = () => {
  const todosCtr = {
    data: {
      todos: loadTodos(),
      filteredTodoById: {},
    },
    selection: new Selection(),
    highlight: new Highlight(),
    filtering: new Filtering(),
  }

  const lookUpTodo = (id?: string) => id ? todosCtr.data.filteredTodoById[id] : undefined;

  mapDataToProps(
    [
      [todosCtr.filtering, 'inputItems'],
      () => todosCtr.data.todos
    ],
    [
      [todosCtr.data, 'filteredTodoById'],
      () => R.indexBy('id')(todosCtr.filtering.filteredItems)
    ],
    [
      [todosCtr.selection, 'selectableIds'],
      () => R.keys(todosCtr.data.filteredTodoById)
    ],
    [
      [todosCtr.selection, 'item'],
      () => R.map(lookUpTodo, todosCtr.selection.ids)
    ],
    [
      [todosCtr.highlight, 'item'],
      () => lookUpTodo(todosCtr.highlight.id)
    ],
  )
}

setOptions({logging: true});
```

## Fact: the `mapDataToProps()` function maps data between objects

The `mapDataToProp()` function takes a container, field name and function then it turns that field into a `get` property that executes the given function. The `mapDataToProps()` is a small convenience function that calls `mapDataToProp()` on each of its arguments. In our example, we see that the `todosCtr.data.todos` field is mapped onto the `todosCtr.filtering.inputItems` field.

## Fact: logging can be enabled using `setOptions()`

By calling `setOptions({logging: true})`, the SkandhaJS library allows you to inspect each facet before and after calling an operation. All facet members that are decorated with `@data` (or `@input`, or `@output`) are logged in a way that looks similar to what you are used to from Redux:

- before and after each operation, the entire container that holds the facet is logged
- all data members of each facet in the container are included in the log
- log entries are nested so that you can see how operation calls are nested

## Fact: the `registerCtr()` function from facets-mobx makes facets observable

If you want to render the facets with React then we need to let React know when data changes. The [skandha-mobx](http://github.com/mnieber/skandha-mobx) library was created for this purpose. It has a `registerCtr()` function that can be used instead of the default one from `skandha`. This replacement version of `registerCtr()` function turns each `@data` member into a Mobx property that is either observable or computed.

## Conclusion

SkandhaJS introduces a lot of new patterns and ideas (that are of course not in fact new) to allow you to
put reusable behaviours on top of your existing data-structures. The difference to a more standard approach
can feel overwhelming, but it's important to point out the beneficial side effect of
separating concerns in a clear and understandable way. We could add a `Editing` facet to our code and install
a policy that says that changing the highlight disables editing. By using facets, we will not be tempted to put
editing-specific code directly in the highlight function (that would obviously be mixing concerns).

In my experience, using SkandhaJS leads to code reuse and improved structure. On top of that, it offers a good
debugging experience by logging all changes in the container. Finally, it works nicely with MobX to render the container contents.
