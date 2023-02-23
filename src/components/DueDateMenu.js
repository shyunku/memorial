import { ContextMenu, useContextMenu } from "molecules/CustomContextMenu";
import DatePicker from "molecules/CustomDatePicker";
import moment from "moment/moment";
import { useEffect } from "react";
import { IoCalendarOutline } from "react-icons/io5";
import JsxUtil from "utils/JsxUtil";
import "./DueDateMenu.scss";

const DueDateMenu = ({ date, setDate, stickRefTo }) => {
  const [contextMenuRef, openerRef, openMenu, closeMenu] = useContextMenu({ stickRefTo });
  const [datePickerRef, _, openDatePicker, closeDatePicker] = useContextMenu({});

  return (
    <div
      ref={openerRef}
      className={"option due-date due-date-menu" + JsxUtil.classByCondition(date != null, "active")}
      onClick={openMenu}
    >
      <div className="visible">
        <div className="icon-wrapper">
          <IoCalendarOutline />
        </div>
        {date != null && <div className="summary">{moment(date).format("YY년 M월 D일 (ddd)")}</div>}
      </div>
      <ContextMenu className={"menus"} reference={contextMenuRef} sticky={true}>
        <div
          className="menu-option"
          onClick={(e) => {
            setDate(Date.now());
            closeMenu();
          }}
        >
          오늘로 설정
        </div>
        <div
          className="menu-option"
          onClick={(e) => {
            setDate(Date.now() + 86400 * 1000);
            closeMenu();
          }}
        >
          내일로 설정
        </div>
        <div className="spliter"></div>
        <div id="set_custom_date_for_new_todo" className="menu-option" onClick={(e) => openDatePicker(e)}>
          직접 설정
        </div>
        {date != null && (
          <>
            <div className="spliter"></div>
            <div
              className="menu-option delete"
              onClick={(e) => {
                setDate(null);
                closeMenu();
              }}
            >
              기한 제거
            </div>
          </>
        )}
      </ContextMenu>
      <DatePicker
        id="new_todo_date_picker_x"
        autoclose="false"
        datePickerRef={datePickerRef}
        onSelect={(e) => {
          setDate(e.getTime());
          closeDatePicker();
        }}
      />
    </div>
  );
};

export default DueDateMenu;
