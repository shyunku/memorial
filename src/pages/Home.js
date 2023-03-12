import TodoContent from "components/TodoContent";
import Toast from "molecules/Toast";
import { useEffect } from "react";
import IpcSender from "utils/IpcSender";

const Home = () => {
  useEffect(() => {
    IpcSender.req.system.setAsHomeWindow(({ success }) => {
      if (!success) {
        Toast.warn("메인 윈도우 설정에 실패했습니다. 창의 크기가 변경 불가능할 수도 있습니다.");
      }
    });
  }, []);

  return (
    <div className="page home">
      <TodoContent />
    </div>
  );
};

export default Home;
