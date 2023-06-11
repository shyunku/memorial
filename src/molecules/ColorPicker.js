import { CirclePicker, SketchPicker } from "react-color";
import JsxUtil from "../utils/JsxUtil";
import "./ColorPicker.scss";

const ColorPicker = ({ color, setColor, visible = false }) => {
  return (
    <div
      className={"color-picker" + JsxUtil.classByCondition(visible, "visible")}
    >
      <CirclePicker color={color} onChangeComplete={(e) => setColor(e.hex)} />
    </div>
  );
};

export default ColorPicker;
