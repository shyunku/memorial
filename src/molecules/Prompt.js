import { useEffect, useMemo, useRef, useState } from "react";
import JsxUtil from "utils/JsxUtil";
import AutoBlurDiv from "./AutoBlurDiv";
import "./Prompt.scss";

const Prompt = () => {
  const inputRefs = useRef([]);

  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [contents, setContents] = useState([]);
  const [options, setOptions] = useState({});
  const inputs = useMemo(() => {
    const inputs = options?.inputs;
    if (!inputs) return [];
    if (!Array.isArray(inputs)) return [inputs];
    return inputs;
  }, [options]);
  const [inputValues, setInputValues] = useState({});

  const finalize = () => {
    setVisible(false);
  };

  const onConfirm = async () => {
    const result = await options?.onConfirm?.(inputValues);
    if (result === false) return;
    finalize();
  };

  const onCancel = () => {
    options?.onCancel?.();
    finalize();
  };

  useEffect(() => {
    const listener = (data) => {
      const promptData = data.data;
      setVisible(true);
      setTitle(promptData?.title);
      setOptions(promptData?.options);

      const rawContents = promptData?.contents;
      let contents = rawContents;
      if (!Array.isArray(contents)) {
        if (typeof contents === "string") contents = contents.split("\n");
        else contents = [];
      }
      setContents(contents);

      const inputs = promptData?.options?.inputs;
      if (inputs) {
        const inputValues = {};
        inputs.forEach((input) => {
          inputValues[input.key] = "";
        });
        setInputValues(inputValues);
      }
    };
    document.addEventListener("custom_prompt", listener);

    let keydownListener;
    if (visible) {
      keydownListener = (e) => {
        if (e.key === "Escape") {
          console.log("close");
        }
      };
      document.addEventListener("keydown", keydownListener);
    }
    return () => {
      document.removeEventListener("custom_prompt", listener);
      if (keydownListener) document.removeEventListener("keydown", keydownListener);
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      let focuser = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
      return () => clearTimeout(focuser);
    }
  }, [visible, inputRefs.current, inputs]);

  return (
    <div className={"custom-prompt-wrapper" + JsxUtil.classByCondition(visible, "visible")}>
      <AutoBlurDiv className={"custom-prompt"} focused={visible} blurHandler={onCancel}>
        <div className="title">{title}</div>
        {contents.length > 0 && (
          <div className="contents">
            {contents.map((c, ind) => (
              <div className="content" key={ind}>
                {c}
              </div>
            ))}
          </div>
        )}
        <div className="inputs">
          {inputs.map((input, ind) => (
            <input
              ref={(ref) => (inputRefs.current[ind] = ref)}
              type={input.type ?? "text"}
              placeholder={input?.placeholder ?? ""}
              key={input.key ?? ind}
              value={inputValues[input.key]}
              onKeyDown={(e) => {
                if (e.key === "Enter" && ind === inputs.length - 1) {
                  onConfirm();
                }
              }}
              onChange={(e) => setInputValues((iv) => ({ ...iv, [input.key]: e.target.value }))}
            />
          ))}
        </div>
        <div className="buttons">
          {options.confirmBtn && (
            <div className="button confirm" onClick={onConfirm}>
              {options.confirmText}
            </div>
          )}
          {options.cancelBtn && (
            <div className="button" onClick={onCancel}>
              {options.cancelText}
            </div>
          )}
        </div>
      </AutoBlurDiv>
    </div>
  );
};

const DEFAULT_OPTIONS = {
  allowEmptyInputs: false,
  inputs: [],
  confirmBtn: true,
  cancelBtn: true,
  confirmText: "확인",
  cancelText: "취소",
  onConfirm: () => {},
  onCancel: () => {},
};

/**
 *
 * @param {string?} title represents the title of the prompt
 * @param {string?} contents represents the contents of the prompt
 * @param {Object?} options represents the options of the prompt
 * most of the options are defined above, there are some requirements for the options.inputs
 * It's usually an array of objects of Inputs, and each object should have the following properties:
 * @param {function} options.onConfirm is the function that will be called when the confirm button is clicked
 * @param {Object[]} options.inputs is the array of inputs, which will be used to determine the inputs of the prompt
 * @param {string} options.inputs[].key is the key of the input, which will be used to return the value of the input with mapping
 * @param {string} [options.inputs[].type='text'] is the type of the input, which will be used to determine the type of the input
 * @param {string} [options.inputs[].placeholder=''] is the placeholder of the input, which will be used to determine the placeholder of the input
 */
const float = (title, contents, options = DEFAULT_OPTIONS) => {
  const promptEvent = new Event("custom_prompt", { bubbles: true });
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  promptEvent.data = {
    title,
    contents,
    options: mergedOptions,
  };
  document.dispatchEvent(promptEvent);
};

export default { Prompt, float };
