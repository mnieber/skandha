export function mapDataToProp(facet: any, prop: string, getter: () => any) {
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
