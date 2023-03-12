import { useEffect, useMemo, useState } from "react";
import { ColorRing } from "react-loader-spinner";
import JsxUtil from "utils/JsxUtil";
import { v4 } from "uuid";
import "./Loading.scss";

const loadingColors = Array(5).fill(`rgb(100, 150, 220)`);

const Loading = () => {
  const [loadings, setLoadings] = useState({});
  const loadingLists = useMemo(() => Object.values(loadings), [loadings]);
  const visible = useMemo(() => loadingLists.length > 0, [loadingLists]);

  useEffect(() => {
    const listener = (e) => {
      const loadingData = e.data;
      const { text, promise, id } = loadingData;
      const loading = { text, promise, id };

      setLoadings((loadings) => ({ ...loadings, [id]: loading }));
      promise.finally(() => {
        setLoadings((loadings) => {
          const newLoadings = { ...loadings };
          delete newLoadings[id];
          return newLoadings;
        });
      });
    };
    document.addEventListener("custom_loading", listener);
    return () => {
      document.removeEventListener("custom_loading", listener);
    };
  }, [loadings]);

  return (
    <div className={"custom-loading-wrapper" + JsxUtil.classByCondition(visible, "visible")}>
      <div className="custom-loading">
        <div className="loading-wrapper">
          <ColorRing colors={loadingColors} />
        </div>
        <div className="loading-text">{loadingLists?.[0]?.text ?? "작업 마무리 중..."}</div>
        {loadingLists.length > 1 && <div className="loading-multiple-tasks">외 {loadingLists.length - 1}개 작업</div>}
      </div>
    </div>
  );
};

const float = async (text, promise) => {
  const loadingEvent = new Event("custom_loading", { bubbles: true });
  if (!(promise instanceof Promise)) {
    throw new Error("Promise is required");
  }
  if (text == null || typeof text !== "string" || text.length === 0) {
    throw new Error("Text is not valid");
  }

  loadingEvent.data = {
    text,
    promise,
    id: v4(),
  };
  document.dispatchEvent(loadingEvent);

  return promise;
};

export default { Loading, float };
