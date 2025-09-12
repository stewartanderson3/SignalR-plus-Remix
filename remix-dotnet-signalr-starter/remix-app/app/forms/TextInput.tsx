import React, { useRef, useEffect, useState } from "react";

const noOp = () => undefined;

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string | number;
  onChange: (value: string | number) => void;
  autofocus?: boolean;
  type?: "text" | "currency" | "percent" | "number";
}

export function TextInput(props: TextInputProps): JSX.Element {
  const { autofocus, value, onChange, ...otherProps } = props;
  const [intermediateValue, setIntermediateValue] = useState<string | undefined>();
  const theInput = useRef<HTMLInputElement | { focus: () => void }>({ focus: noOp });
  const displays = {
    percent: (val: string | number | undefined) => {
      return intermediateValue || intermediateValue === "" ? intermediateValue
        : val === "" ? val
          : (val as number * 100).toLocaleString(undefined, { minimumFractionDigits: 0 });
    },
    currency: (val: string | number | undefined) => {
      if (val === undefined || val === null || val === "") return "";
      const num = typeof val === "number" ? val : parseFloat(val);
      if (isNaN(num)) return "";
      return "$" + Number(num).toLocaleString(undefined, { minimumFractionDigits: 0 });
    },
    text: (val: string | number | undefined) => (val === undefined || val === null ? "" : val.toString()),
    number: (val: string | number | undefined) => {
      if (val === undefined || val === null || val === "") return "";
      const num = typeof val === "number" ? val : parseFloat(val);
      if (isNaN(num)) return "";
      return Number(num).toLocaleString(undefined, { minimumFractionDigits: 0 });
    }
  }

  const parses = {
    percent: (val: string) => {
      const matches = val.match(/^-?[\d,]*\.?\d{0,8}/);
      const formattedNumber = matches ? matches[0] : "";
      setIntermediateValue(formattedNumber);
      if (!formattedNumber || formattedNumber.trim() === "") return undefined;
      const num = parseFloat(formattedNumber);
      if (isNaN(num)) return undefined;
      const fractional = num / 100;
      return fractional;
    },
    currency: (val: string) => {
      if (!val || val.trim() === "") return undefined;
      const num = parseFloat(val.replace(/[$,]/g, ""));
      if (isNaN(num)) return undefined;
      return num;
    },
    text: (val: string) => (val === undefined || val === null ? "" : val.toString()),
    number: (val: string) => {
      if (!val || val.trim() === "") return undefined;
      const num = parseFloat(val.replace(/[,]/g, ""));
      if (isNaN(num)) return undefined;
      return num;
    }
  }

  useEffect(() => {
    if (autofocus && "focus" in theInput.current) theInput.current.focus();
  }, [autofocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const type = props.type ?? "text";
    onChange(parses[type](e.target.value) ?? "");
  };

  const inputValue = displays[props.type ?? "text"](value);

  return (
    <input
      className="form-control"
      {...otherProps}
      ref={theInput as React.MutableRefObject<HTMLInputElement>}
      type="text"
      value={inputValue}
      onChange={handleChange}
    />
  );
}
