export function mapDataToProp<F, P extends keyof F>(
  facet: F,
  prop: P,
  getter: () => F[P]
) {
  delete facet[prop];
  Object.defineProperty(facet, prop, {
    get: getter,
    enumerable: true,
    configurable: true,
  });
}

type Mappings<F> = {
  [K in keyof F]?: {
    [P in keyof F[K]]?: () => F[K][P];
  };
};

export function mapDataToProps<T>(target: T, mappings: Mappings<T>) {
  for (const key in mappings) {
    if (mappings.hasOwnProperty(key)) {
      const facet = target[key as keyof T];
      const propMappings = mappings[key as keyof T];
      if (facet && propMappings) {
        for (const prop in propMappings) {
          if (propMappings.hasOwnProperty(prop)) {
            const getter = propMappings[prop as any];
            if (getter) {
              mapDataToProp(facet, prop as keyof typeof facet, getter);
            }
          }
        }
      }
    }
  }
}
