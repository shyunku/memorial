import moment from "moment/moment";
import "./Clock.scss";
import { useEffect, useState } from "react";

const Clock = () => {
  const [incrementer, setIncrementer] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIncrementer(incrementer + 1);
    }, 0);
    return () => clearInterval(interval);
  });

  return (
    <div className={"clock"}>
      <div className={"date"}>{moment().format("YYYY년 MM월 DD일 (dddd)")}</div>
      <div className={"time"}>
        <div className={"by-sec"}>{moment().format("a h:mm:ss")}</div>
        <div className={"by-milli"}>{moment().format(".SSS")}</div>
      </div>
    </div>
  );
};

export default Clock;
