import { useEffect } from "react";

const ExpandableDiv = ({ children, expand, ...rest }) => {
  useEffect(() => {
    if (expand) {
      // expand
    } else {
      // collapse
    }
  }, [expand]);

  return (
    <div className="collapsable-div" {...rest}>
      {children}
    </div>
  );
};

export default ExpandableDiv;
