import { ContextMenu, useContextMenu } from "molecules/CustomContextMenu";
import DateTimePicker from "molecules/CustomDateTimePicker";
import moment from "moment/moment";
import { useEffect, useMemo, useState } from "react";
import { IoCalendarClearOutline, IoCalendarOutline } from "react-icons/io5";
import JsxUtil from "utils/JsxUtil";
import { v4 } from "uuid";
import "./TaskOptionMenu.scss";

const DueDateMenu = ({ date, setDate, stickRefTo, withoutForm = false }) => {
  const [dateMenuId] = useState(`due_date_menu_${v4()}`);
  const dueDateSettingCtx = useContextMenu({
    stickRefTo,
    preventCloseIdList: [dateMenuId],
  });
  const datePickerCtx = useContextMenu({});
  const isOverDue = useMemo(() => {
    if (!date) return false;
    return moment(date).isBefore(moment());
  }, [JSON.stringify(date)]);

  return (
    <>
      <div
        className={
          "option due-date task-option-menu" +
          JsxUtil.classByCondition(date != null, "active") +
          JsxUtil.classByCondition(isOverDue, "overdue")
        }
      >
        <div
          className={"visible" + JsxUtil.classByCondition(withoutForm, "without-form")}
          ref={dueDateSettingCtx.openerRef}
          onClick={dueDateSettingCtx.opener}
        >
          <div className="icon-wrapper">{date != null ? <IoCalendarOutline /> : <IoCalendarClearOutline />}</div>
          {date != null && <div className="summary">{moment(date).format("YY년 M월 D일 (ddd) A h시 mm분")}</div>}
        </div>
        <ContextMenu className={"menus"} reference={dueDateSettingCtx.ref} sticky={true}>
          <div
            className="menu-option"
            onClick={(e) => {
              setDate(moment().endOf("day").hours(23).minutes(59).seconds(59).toDate());
              dueDateSettingCtx.closer();
            }}
          >
            오늘로 설정
          </div>
          <div
            className="menu-option"
            onClick={(e) => {
              setDate(moment().add(1, "days").hours(23).minutes(59).seconds(59).toDate());
              dueDateSettingCtx.closer();
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
                  setDate(moment(date).add(1, "days").toDate());
                  dueDateSettingCtx.closer();
                }}
              >
                하루 미루기
              </div>
              <div
                className="menu-option"
                onClick={(e) => {
                  setDate(moment(date).add(1, "weeks").toDate());
                  dueDateSettingCtx.closer();
                }}
              >
                일주일 미루기
              </div>
              <div className="spliter"></div>
            </>
          )}
          <div
            id="set_custom_date_for_new_todo"
            ref={datePickerCtx.openerRef}
            className="menu-option"
            onClick={(e) => datePickerCtx.opener(e)}
          >
            직접 설정
          </div>
          {date != null && (
            <>
              <div className="spliter"></div>
              <div
                className="menu-option delete"
                onClick={(e) => {
                  setDate(null);
                  dueDateSettingCtx.closer();
                }}
              >
                기한 제거
              </div>
            </>
          )}
        </ContextMenu>
        <DateTimePicker
          id={dateMenuId}
          autoclose="false"
          datePickerRef={datePickerCtx.ref}
          date={date}
          closer={(...arg) => {
            dueDateSettingCtx.closer(...arg);
            datePickerCtx.closer(...arg);
          }}
          onSelect={(e) => {
            setDate(new Date(e));
            // datePickerCtx.closer();
          }}
        />
      </div>
    </>
  );
};

export default DueDateMenu;
