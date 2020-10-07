export function installPolicies(policies, ctr) {
  policies.forEach((policy) => {
    policy(ctr);
  });
}
