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
  // (Legacy helper removed; using inline handlers now)
  const theInput = useRef<HTMLInputElement | { focus: () => void }>({ focus: noOp });
  const displays = {
    percent: (val: string | number | undefined) => {
      if (val === undefined || val === null || val === "") return "";
      const num = typeof val === "number" ? val : parseFloat(val as string);
      if (isNaN(num)) return "";
      const pct = num * 100;
      let str = pct.toFixed(8);
      str = str.replace(/\.0+$/, "");
      str = str.replace(/(\.[0-9]*?)0+$/, "$1");
      return str;
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
      if (!val || val.trim() === "") return undefined;
      const num = parseFloat(val);
      if (isNaN(num)) return undefined;
      const fractional = num / 100;
      return parseFloat(fractional.toFixed(8));
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

  // Single local state for percent input; initialized from prop value once (no sync on later external changes)
  const [percentInput, setPercentInput] = useState(() => displays.percent(value));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = props.type ?? "text";
    if (t === "percent") {
      const txt = e.target.value;
      setPercentInput(txt);
      // Allow transitional forms (don't emit value yet)
      if (txt === '' || /^-?$/.test(txt) || txt === '.' || txt === '-.' || /^-?\d+\.$/.test(txt)) return;
      if (/^-?\d*\.?\d*$/.test(txt)) {
        const num = parseFloat(txt);
        if (!isNaN(num)) {
          const fractional = parseFloat((num / 100).toFixed(8));
          onChange(fractional);
        }
      }
      return;
    }
    onChange(parses[t](e.target.value) ?? "");
  };

  const isPercent = props.type === "percent";
  const inputValue = isPercent ? percentInput : displays[props.type ?? "text"](value);

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
