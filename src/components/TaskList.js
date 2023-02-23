import TodoItem from "./TodoItem";

const TaskList = ({ list = [], selectedId, selectTodoItemHandler = () => {}, ...rest }) => {
  return (
    <div className="todo-list">
      {list.map((todo) => (
        <TodoItem
          selected={selectedId == todo.id}
          key={todo.id}
          todo={todo}
          onClick={(e) => {
            selectTodoItemHandler(todo.id);
          }}
          blurHandler={(e) => selectTodoItemHandler(null)}
          {...rest}
        />
      ))}
    </div>
  );
};

export default TaskList;
