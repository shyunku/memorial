import useThrottle from "hooks/UseThrottle";
import { useMemo, useRef } from "react";
import { debounce } from "utils/Common";
import TodoItem from "./TodoItem";

const TaskList = ({
  taskList = [],
  selectedId,
  selectTodoItemHandler = () => {},
  ...rest
}) => {
  const todoListRef = useRef();

  const onTaskDropPredict = (e, task) => {
    // find the closest todo item that center position is higher than the drop position
    const todoItemWrappers =
      todoListRef.current.querySelectorAll(".todo-item-wrapper");

    if (e.clientY === 0) return [];

    const dropPosition = e.clientY;
    let closestPrevTodoItem = null;
    let closestPrevTodoItemCenter = null;
    let closestNextTodoItem = null;
    let closestNextTodoItemCenter = null;

    // find linear search
    for (let i = 0; i < todoItemWrappers.length; i++) {
      if (task.id == todoItemWrappers[i].getAttribute("todo-id")) continue; // skip the task itself
      // console.log(todoItemWrappers[i].id, task.id);
      const todoItemWrapper = todoItemWrappers[i];
      const todoItemWrapperRect = todoItemWrapper.getBoundingClientRect();
      const todoItemWrapperCenter =
        todoItemWrapperRect.top + todoItemWrapperRect.height / 2;

      if (todoItemWrapperCenter < dropPosition) {
        if (
          closestPrevTodoItemCenter &&
          closestPrevTodoItemCenter > todoItemWrapperCenter
        )
          continue;
        closestPrevTodoItem = todoItemWrapper;
        closestPrevTodoItemCenter = todoItemWrapperCenter;
      } else {
        if (
          closestNextTodoItemCenter &&
          closestNextTodoItemCenter < todoItemWrapperCenter
        )
          continue;
        closestNextTodoItem = todoItemWrapper;
        closestNextTodoItemCenter = todoItemWrapperCenter;
      }
    }

    return [
      closestPrevTodoItem?.id ?? closestNextTodoItem?.id,
      closestPrevTodoItem?.id == null,
    ];
  };

  return (
    <div className="todo-list" ref={todoListRef}>
      {taskList.map((todo) => (
        <TodoItem
          selected={selectedId == todo.id}
          key={todo.id}
          todo={todo}
          onClick={(e) => {
            selectTodoItemHandler(todo.id);
          }}
          blurHandler={(e) => selectTodoItemHandler(null)}
          onTaskDropPredict={onTaskDropPredict}
          {...rest}
        />
      ))}
    </div>
  );
};

export default TaskList;
