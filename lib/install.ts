export function installPolicies<CtrT>(
  policies: ((ctr: CtrT) => void)[],
  ctr: CtrT
) {
  policies.forEach((policy) => {
    policy(ctr);
  });
}
