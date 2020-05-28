export function installPolicies(policies, ctr) {
  policies.forEach(policy => {
    policy(ctr);
  });
}

export function installHandlers(handlers, facet) {
  handlers.forEach(handler => {
    handler(facet);
  });
}
