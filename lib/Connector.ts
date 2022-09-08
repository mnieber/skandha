import { mapDataToProp } from './patch';

type EntityByKeyT = { [key: string]: Entity };
type FieldByNameT = { [name: string]: Field };

type OptionsT = {
  strict: boolean;
};

function _path(path: string, obj: any) {
  let result = obj;
  for (const part of path.split('.')) {
    result = result?.[part];
    if (result === undefined) return result;
  }
  return result;
}

class Connector {
  obj: any;
  entityByKey: EntityByKeyT = {};
  options: OptionsT;

  constructor(obj: any, options?: OptionsT) {
    this.options = {
      strict: options?.strict ?? true,
    };

    this.obj = obj;
  }

  getOrCreateEntity = (key: string): Entity => {
    if (this.entityByKey[key]) return this.entityByKey[key];

    const obj = _path(key, this.obj);
    const entity = new Proxy(new Entity(obj), {
      get: (target: any, key: string) => {
        return target[key] || target.getOrCreateField(key);
      },
      set: (target: any, key: string | symbol, value: any) => {
        target.fieldByName[key] = value;
        return true;
      },
    });

    this.entityByKey[key] = entity;
    return entity;
  };

  connect = () => {
    for (const entity of Object.values(this.entityByKey)) {
      this._connectEntity(entity);
    }
  };

  _connectEntity = (entity: Entity) => {
    for (const entry of Object.entries(entity.fieldByName)) {
      const [name, field] = entry;
      if (this.options.strict && !(name in entity.obj)) {
        throw new Error(
          `Cannot override the field ${name} in ${entity.obj}.` +
            'Field not found. Disable strict mode to ignore this error.'
        );
      }
      mapDataToProp(entity.obj, name, () => {
        return field.getSource();
      });
    }
  };
}

export const createConnector = (obj: any) => {
  const con = new Connector(obj);
  return new Proxy(con, {
    get: (target: any, key: string) => {
      return target[key] ?? target.getOrCreateEntity(key);
    },
  });
};

class Entity {
  obj: any;
  fieldByName: FieldByNameT = {};

  constructor(obj: any) {
    this.obj = obj;
  }

  getOrCreateField = (name: string): Field => {
    // If we create a new field then we should *not* store it in fieldByName.
    return this.fieldByName[name] ?? new Field(this.obj, name);
  };
}

class Field {
  obj: any;
  name: string;
  transforms: Function[] = [];

  constructor(obj: any, name: string) {
    this.obj = obj;
    this.name = name;
  }

  getSource = () => {
    if (!(this.name in this.obj)) {
      throw new Error(
        `Field ${this.name} does not exist on object ${this.obj}`
      );
    }
    let result = this.obj[this.name];
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
