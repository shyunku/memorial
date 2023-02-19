import "./LeftSidebar.scss";
import ProfileImage from "./ProfileImage";

const LeftSidebar = () => {
  return (
    <div className="component left-sidebar">
      <div className="todo-menu-groups">
        <div className="todo-menu-group standard">
          <div className="title">일반</div>
          <div className="todo-menus">
            <div className="todo-menu selected">모든 할일</div>
            <div className="todo-menu">오늘의 할일</div>
            <div className="todo-menu">중요한 일</div>
          </div>
        </div>
        <div className="todo-menu-group custom">
          <div className="title">CUSTOM</div>
          <div className="todo-menus">
            <div className="todo-menu">개인</div>
            <div className="todo-menu">회사</div>
            <div className="todo-menu">학교</div>
            <div className="todo-menu">Baekjoon</div>
          </div>
        </div>
      </div>
      <div className="account-section">
        <ProfileImage />
        <div className="profile-summary">
          <div className="email">whdudgns7321@gmail.com</div>
          <div className="status synchronizing">
            <div className="status-dot"></div>
            <div className="status-text">동기화 중...</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
