import useThrottle from "hooks/UseThrottle";
import { useRef } from "react";
import { debounce } from "utils/Common";
import TodoItem from "./TodoItem";

const TaskList = ({ list = [], selectedId, selectTodoItemHandler = () => {}, ...rest }) => {
  const todoListRef = useRef();
  const onTaskDropPredict = (e, task) => {
    // find the closest todo item that center position is higher than the drop position
    const todoItemWrappers = todoListRef.current.querySelectorAll(".todo-item-wrapper");
    const dropPosition = e.clientY;
    let closestPrevTodoItem = null;
    let closestPrevTodoItemCenter = null;
    let closestNextTodoItem = null;
    let closestNextTodoItemCenter = null;

    // find linear search
    for (let i = 0; i < todoItemWrappers.length; i++) {
      if (task.id == todoItemWrappers[i].id) continue; // skip the task itself
      const todoItemWrapper = todoItemWrappers[i];
      const todoItemWrapperRect = todoItemWrapper.getBoundingClientRect();
      const todoItemWrapperCenter = todoItemWrapperRect.top + todoItemWrapperRect.height / 2;

      if (todoItemWrapperCenter < dropPosition) {
        if (closestPrevTodoItemCenter && closestPrevTodoItemCenter > todoItemWrapperCenter) continue;
        closestPrevTodoItem = todoItemWrapper;
        closestPrevTodoItemCenter = todoItemWrapperCenter;
      } else {
        if (closestNextTodoItemCenter && closestNextTodoItemCenter < todoItemWrapperCenter) continue;
        closestNextTodoItem = todoItemWrapper;
        closestNextTodoItemCenter = todoItemWrapperCenter;
      }
    }

    return [closestPrevTodoItem?.id ?? closestNextTodoItem?.id, closestPrevTodoItem?.id == null];
  };

  const onTaskDropHandler = (e, task) => {
    return false;
  };

  return (
    <div className="todo-list" ref={todoListRef}>
      {list.map((todo) => (
        <TodoItem
          selected={selectedId == todo.id}
          key={todo.id}
          todo={todo}
          onClick={(e) => {
            selectTodoItemHandler(todo.id);
          }}
          blurHandler={(e) => selectTodoItemHandler(null)}
          onTaskDropHandler={onTaskDropHandler}
          onTaskDropPredict={onTaskDropPredict}
          {...rest}
        />
      ))}
    </div>
  );
};

export default TaskList;
