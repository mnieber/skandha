import { NestedDefaultPropsProvider } from "mergeDefaultProps";
import { compose } from "rambda";
import * as React from "react";

export const CtrProvider = props => {
  const [ctr, setCtr] = React.useState(props.createCtr);

  return (
    <NestedDefaultPropsProvider value={props.getDefaultProps(ctr)}>
      {props.children}
    </NestedDefaultPropsProvider>
  );
};
