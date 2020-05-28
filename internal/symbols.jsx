export const symbols = {
  symbol: Symbol("facetSymbol"),
  operationSignalsBefore: Symbol("facetOperationSignalsBefore"),
  operationSignalsAfter: Symbol("facetOperationSignalsAfter"),
  operationHandlers: Symbol("facetOperationHandlers"),
  dataMembers: Symbol("facetDataMembers"),
  facetMembers: Symbol("facetFacetMembers"),
  parentContainer: Symbol("facetParentContainer"),
};

export function symbolName(symbol: Symbol) {
  const prefix = "Symbol(";
  const chop = x =>
    x.startsWith(prefix) ? x.substring(prefix.length, x.length - 1) : x;
  return chop(symbol.toString());
}
