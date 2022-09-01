export function mapDataToProp(facet: any, prop: string, getter: () => any) {
  delete facet[prop];
  Object.defineProperty(facet, prop, {
    get: getter,
    enumerable: true,
    configurable: true,
  });
}
