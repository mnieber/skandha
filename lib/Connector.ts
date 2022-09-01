import { mapDataToProp } from './patch';

type FunctionByNameT = { [name: string]: Function };
type EntityByNameT = { [name: string]: Entity };
type FieldByNameT = { [name: string]: Field };

type OptionsT = {
  strict: boolean;
};

class Connector {
  entityByName: EntityByNameT = {};
  options: OptionsT;

  constructor(entities: FunctionByNameT, options?: OptionsT) {
    this.options = {
      strict: options?.strict ?? true,
    };

    for (const entry of Object.entries(entities)) {
      const [name, getObj] = entry;
      this.entityByName[name] = new Entity(getObj);
    }
  }

  connect = () => {
    for (const entity of Object.values(this.entityByName)) {
      this._connectEntity(entity);
    }
  };

  _connectEntity = (entity: Entity) => {
    for (const entry of Object.entries(entity.fieldByName)) {
      const [name, field] = entry;
      const obj = entity.getObj();
      if (this.options.strict && !(name in obj)) {
        throw new Error(
          `Cannot override the field ${name} in ${obj}.` +
            'Field not found. Disable strict mode to ignore this error.'
        );
      }
      mapDataToProp(obj, name, () => {
        return field.getSource();
      });
    }
  };
}

export const createConnector = (entities: FunctionByNameT) => {
  const con = new Connector(entities);
  return new Proxy(con, {
    get: (target: any, key: string) => {
      // Code example:
      //
      // const con = createConnector({ foo: () => myFoo });
      //
      // When you call `con.foo` then you
      // receive `con.entityByName.foo.fieldByName`.
      //
      // con.foo.bar = 5;  // Equivalent to: con.entityByName.foo.fieldByName.bar = 5
      //
      // When you call `con.connect` then a normal lookup of the `connect`
      // member in `con` is performed.

      return target.entityByName[key]?.fieldByName ?? target[key];
    },
  });
};

class Entity {
  getObj: Function;
  fieldByName: FieldByNameT;

  constructor(getObj: Function) {
    this.getObj = getObj;
    this.fieldByName = new Proxy(
      {},
      {
        get: (target: any, key: string) => {
          return target[key] ?? new Field(this, key);
        },
      }
    );
  }
}

class Field {
  entity: Entity;
  name: string;
  transforms: Function[] = [];

  constructor(entity: Entity, name: string) {
    this.entity = entity;
    this.name = name;
  }

  getSource = () => {
    const obj = this.entity.getObj();
    if (!(this.name in obj)) {
      throw new Error(`Field ${this.name} does not exist on object ${obj}`);
    }
    let result = obj[this.name];
    for (const tf of this.transforms) {
      result = tf(result);
    }
    return result;
  };

  tf(transform: Function) {
    this.transforms.push(transform);
    return this;
  }
}
