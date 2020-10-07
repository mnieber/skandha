export const symbols = {
  symbol: Symbol('facetSymbol'),
  eventSignal: Symbol('facetEventSignal'),
  operationHandlers: Symbol('facetOperationHandlers'),
  dataMembers: Symbol('facetDataMembers'),
  facetMembers: Symbol('facetFacetMembers'),
  parentContainer: Symbol('facetParentContainer'),
};

export function symbolName(symbol) {
  const prefix = 'Symbol(';
  const chop = (x) =>
    x.startsWith(prefix) ? x.substring(prefix.length, x.length - 1) : x;
  return chop(symbol.toString());
}
