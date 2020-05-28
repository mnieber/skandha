import { NestedDefaultPropsProvider } from "mergeDefaultProps";
import { compose } from "rambda";
import { observer } from "mobx-react";
import * as React from "react";

export const CtrProvider = observer(props => {
  const [ctr, setCtr] = React.useState(props.createCtr);

  return (
    <NestedDefaultPropsProvider value={props.getDefaultProps(ctr)}>
      {props.children}
    </NestedDefaultPropsProvider>
  );
});
