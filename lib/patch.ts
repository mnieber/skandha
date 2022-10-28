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

export function mapDataToProps(...mappings: any[]) {
  for (const mapping of mappings) {
    mapDataToProp(mapping[0][0], mapping[0][1], mapping[1]);
  }
}

export function pmap<F, P extends keyof F>(member: [F, P], getter: () => F[P]) {
  return [member, getter];
}
