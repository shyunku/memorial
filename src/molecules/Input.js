const Input = ({ onChange = () => {}, onEnter, onKeyDown, value, ...rest }) => {
  const handleChange = (e) => {
    onChange?.(e.target.value);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onEnter?.();
    }
    onKeyDown?.(e);
  };
  return <input onChange={handleChange} onKeyDown={handleKeyDown} value={value} {...rest} />;
};

export default Input;
