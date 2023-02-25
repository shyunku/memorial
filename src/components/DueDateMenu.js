import { ContextMenu, useContextMenu } from "molecules/CustomContextMenu";
import DatePicker from "molecules/CustomDatePicker";
import moment from "moment/moment";
import { useEffect, useMemo, useState } from "react";
import { IoCalendarOutline } from "react-icons/io5";
import JsxUtil from "utils/JsxUtil";
import { v4 } from "uuid";
import "./DueDateMenu.scss";

const DueDateMenu = ({ date, setDate, stickRefTo }) => {
  const [dateMenuId] = useState(`due_date_menu_${v4()}`);
  const [contextMenuRef, openerRef, openMenu, closeMenu] = useContextMenu({
    stickRefTo,
    preventCloseIdList: [dateMenuId],
  });
  const [datePickerRef, _, openDatePicker, closeDatePicker] = useContextMenu({});
  const isOverDue = useMemo(() => {
    if (!date) return false;
    return moment(date).isBefore(moment());
  }, [JSON.stringify(date)]);

  return (
    <div
      ref={openerRef}
      className={
        "option due-date due-date-menu" +
        JsxUtil.classByCondition(date != null, "active") +
        JsxUtil.classByCondition(isOverDue, "overdue")
      }
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
            setDate(moment().endOf("day").toDate());
            closeMenu();
          }}
        >
          오늘로 설정
        </div>
        <div
          className="menu-option"
          onClick={(e) => {
            setDate(moment().add(1, "days").endOf("day").toDate());
            closeMenu();
          }}
        >
          내일로 설정
        </div>
        <div className="spliter"></div>
        {date != null && (
          <>
            <div
              className="menu-option"
              onClick={(e) => {
                setDate(moment(date).add(1, "days").endOf("day").toDate());
                closeMenu();
              }}
            >
              하루 미루기
            </div>
            <div
              className="menu-option"
              onClick={(e) => {
                setDate(moment(date).add(1, "weeks").endOf("day").toDate());
                closeMenu();
              }}
            >
              일주일 미루기
            </div>
            <div className="spliter"></div>
          </>
        )}
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
        id={dateMenuId}
        autoclose="false"
        datePickerRef={datePickerRef}
        onSelect={(e) => {
          setDate(moment(e).endOf("day").toDate());
          closeDatePicker();
        }}
      />
    </div>
  );
};

export default DueDateMenu;
