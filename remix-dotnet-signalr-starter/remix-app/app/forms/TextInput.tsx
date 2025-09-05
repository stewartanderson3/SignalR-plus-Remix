import React, { useRef, useEffect } from "react";

const noOp = () => undefined;

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string | number;
  onChange: (value: string) => void;
  autofocus?: boolean;
}

export function TextInput(props: TextInputProps): JSX.Element {
  const { autofocus, value, onChange, ...otherProps } = props;
  const onTextChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange(event?.target?.value ?? "");
  const theInput = useRef<HTMLInputElement | { focus: () => void }>({ focus: noOp });

  useEffect(() => {
    if (autofocus && "focus" in theInput.current) theInput.current.focus();
  }, [autofocus]);

  return (
    <input
      className="form-control"
      {...otherProps}
      ref={theInput as React.MutableRefObject<HTMLInputElement>}
      type="text"
      value={value ?? ""}
      onChange={onTextChange}
    />
  );
}