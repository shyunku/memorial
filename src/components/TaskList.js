import useThrottle from "hooks/UseThrottle";
import { useRef } from "react";
import { debounce } from "utils/Common";
import TodoItem from "./TodoItem";

const TaskList = ({ list = [], selectedId, selectTodoItemHandler = () => {}, ...rest }) => {
  const todoListRef = useRef();
  const onTaskDropPredict = useThrottle(
    (e, task) => {
      console.log("calc");
      // find the closest todo item that center position is higher than the drop position
      const todoItemWrappers = todoListRef.current.querySelectorAll(".todo-item-wrapper");
      const dropPosition = e.clientY;
      let closestTodoItem = null;
      let closestTodoItemCenter = 0;

      // sort by center position
      // let sortedWrappers = Array.from(todoItemWrappers).sort((a, b) => {
      //   const aRect = a.getBoundingClientRect();
      //   const bRect = b.getBoundingClientRect();
      //   const aCenter = aRect.top + aRect.height / 2;
      //   const bCenter = bRect.top + bRect.height / 2;
      //   return aCenter - bCenter;
      // });

      // // find closest by binary search
      // let left = 0;
      // let right = sortedWrappers.length - 1;
      // while (left <= right) {
      //   const mid = Math.floor((left + right) / 2);
      //   const todoItemWrapper = sortedWrappers[mid];
      //   const todoItemWrapperRect = todoItemWrapper.getBoundingClientRect();
      //   const todoItemWrapperCenter = todoItemWrapperRect.top + todoItemWrapperRect.height / 2;
      //   if (todoItemWrapperCenter < dropPosition) {
      //     left = mid + 1;
      //     closestTodoItem = todoItemWrapper;
      //     closestTodoItemCenter = todoItemWrapperCenter;
      //   } else {
      //     right = mid - 1;
      //   }
      // }

      // find linear search
      for (let i = 0; i < todoItemWrappers.length; i++) {
        if (task.id == todoItemWrappers[i].id) continue; // skip the task itself (if it is in the list
        const todoItemWrapper = todoItemWrappers[i];
        const todoItemWrapperRect = todoItemWrapper.getBoundingClientRect();
        const todoItemWrapperCenter = todoItemWrapperRect.top + todoItemWrapperRect.height / 2;
        if (todoItemWrapperCenter < dropPosition) {
          closestTodoItem = todoItemWrapper;
          closestTodoItemCenter = todoItemWrapperCenter;
          // break;
        }
      }

      return closestTodoItem?.id;
    },
    1000,
    true
  );

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
