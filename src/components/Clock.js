import moment from "moment/moment";
import "./Clock.scss";
import { useEffect, useMemo, useState } from "react";

const Clock = () => {
  const [incrementer, setIncrementer] = useState(0);
  const date = useMemo(
    () => moment().format("YYYY년 MM월 DD일 (dddd)"),
    [incrementer]
  );
  const time = useMemo(() => moment().format("a h:mm:ss"), [incrementer]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIncrementer(incrementer + 1);
    }, 1000);
    return () => clearInterval(interval);
  });

  return (
    <div className={"clock"}>
      <div className={"date"}>{date}</div>
      <div className={"time"}>
        <div className={"by-sec"}>{time}</div>
        {/*<div className={"by-milli"}>{moment().format(".SSS")}</div>*/}
      </div>
    </div>
  );
};

export default Clock;
