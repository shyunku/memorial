import { useState } from "react";
import { MdCheckBox, MdCheckBoxOutlineBlank } from "react-icons/md";
import "./CheckBox.scss";

const CheckBox = ({ value: checked, onChange }) => {
  const onCheckBoxClick = () => {
    onChange(!checked);
  };

  return (
    <div className="form-check" onClick={onCheckBoxClick}>
      {checked ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
    </div>
  );
};

export default CheckBox;
