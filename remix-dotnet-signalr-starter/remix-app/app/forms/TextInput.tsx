import React, { useRef, useEffect } from "react";

const noOp = () => undefined;

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string | number;
  onChange: (value: string | number) => void;
  autofocus?: boolean;
  type?: "text" | "currency" | "percent";
}

export function TextInput(props: TextInputProps): JSX.Element {
  const { autofocus, value, onChange, ...otherProps } = props;
  const onTextChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange(event?.target?.value ?? "");
  const theInput = useRef<HTMLInputElement | { focus: () => void }>({ focus: noOp });
  const displays = {
    percent: (val: string | number | undefined) => {
      if (val === undefined || val === null || val === "") return "";
      const num = typeof val === "number" ? val : parseFloat(val);
      if (isNaN(num)) return "";
      return (num * 100);
    },
    currency: (val: string | number | undefined) => {
      if (val === undefined || val === null || val === "") return "";
      const num = typeof val === "number" ? val : parseFloat(val);
      if (isNaN(num)) return "";
      return "$" + Number(num).toLocaleString(undefined, { minimumFractionDigits: 0 });
    },
    text: (val: string | number | undefined) => (val === undefined || val === null ? "" : val.toString()),
  }

  const parses = {
    percent: (val: string) => {
      if (!val || val.trim() === "") return undefined;
      const num = parseFloat(val);
      if (isNaN(num)) return undefined;
      return num / 100;
    },
    currency: (val: string) => {
      if (!val || val.trim() === "") return undefined;
      const num = parseFloat(val.replace(/[$,]/g, ""));
      if (isNaN(num)) return undefined;
      return num;
    },
    text: (val: string) => (val === undefined || val === null ? "" : val.toString()),
  }

  useEffect(() => {
    if (autofocus && "focus" in theInput.current) theInput.current.focus();
  }, [autofocus]);

  return (
    <input
      className="form-control"
      {...otherProps}
      ref={theInput as React.MutableRefObject<HTMLInputElement>}
      type="text"
      value={displays[props.type ?? "text"](value)}
      onChange={(e) => onChange(parses[props.type ?? "text"](e.target.value) ?? "")}
    />
  );
}
