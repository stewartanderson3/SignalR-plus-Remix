import React, { useEffect, useState } from "react";
import {
  Leaf,
  useValidationModel,
  useLoadingState,
  useErrorHandler,
  useLocalStorageState,
  set,
} from "leaf-validator";
import { TextInput } from "./TextInput";
import { useActiveStep } from "../steps";
import { NormalizedList, NormalizedListGrid } from "./NormalizedList";

type Validator = (value: string | undefined | null) => false | string[];

interface FormField {
  name: string;
  location: string; // dot path into model
  validators: Validator[];
  type: "text" | "list" | "currency" | "percent" | "number" | "select";
  [key: string]: any;
}

interface StepStateMeta {
  isLoading: boolean;
  isSkippable: boolean;
}

interface StepApi {
  submit: (event?: React.FormEvent) => Promise<void>;
}

interface SubmitPayload {
  model: Record<string, unknown>;
  form: FormField[];
}

interface FormProps {
  form: FormField[];
  model: Record<string, unknown>;
  setModel: (m: any) => void;
  completionStatusPath?: string;
}

export function Form({ form, model, setModel, completionStatusPath }: FormProps): JSX.Element {
  const { stepApi, setStepState } = useActiveStep<StepStateMeta, StepApi>();
  const validationModel = useValidationModel();
  const [showAllValidation, setShowAllValidation] = useState(false);
  const { clearError, errorHandler, errors } = useErrorHandler();
  const [isSubmitting, showSubmittingWhile] = useLoadingState({ errorHandler });
  const hasErrors = validationModel.getAllErrorsForLocation("").length > 0;
  const submit = async (event?: React.FormEvent): Promise<void> => {
    if (event) event.preventDefault();
    setShowAllValidation(true);
    // if (validationModel.getAllErrorsForLocation("").length === 0) {
    //   await showSubmittingWhile(fakeSendDataToServer({ model: model!, form }));
    // }

    if (hasErrors) throw new Error("Has validation errors");
  };

  stepApi.current = { submit };

  useEffect(() => {
    setStepState({ isLoading: isSubmitting, isSkippable: true });
  }, [isSubmitting, setStepState]);

  useEffect(() => {
    completionStatusPath && setModel((model: any) => set(completionStatusPath).to(!hasErrors).in(model));
  }, [hasErrors]);

  return (
    <div className="App">
      {errors?.length > 0 && (
        <ul>
          {errors.map((error, index) => (
            <li key={index}>
              <button
                className="btn btn-link"
                onClick={() => clearError(error)}
              >
                X
              </button>
              {error.message}
            </li>
          ))}
        </ul>
      )}
      <form>
        {formElements({
          form,
          model: model!,
          setModel,
          showAllValidation,
          validationModel,
        })}
      </form>
    </div>
  );
}

interface FormElementsParams {
  form: FormField[];
  model: Record<string, unknown>;
  setModel: (m: any) => void; // library likely gives us (next: any) => void
  showAllValidation: boolean;
  validationModel: any; // unknown library shape
}

function formElements({
  form,
  model,
  setModel,
  showAllValidation,
  validationModel,
}: FormElementsParams): JSX.Element[] {
  // Group list-type fields so they can render in a flex grid rather than vertical stack
  const listFields = form.filter(f => f.type === 'list');
  const otherFields = form.filter(f => f.type !== 'list');

  const renderField = ({ name, type, placeholder, autofocus, items, ...formElement }: FormField, index: number) => (
    <Leaf
      key={index}
      showErrors={showAllValidation}
      model={model}
      onChange={setModel}
      validationModel={validationModel}
      {...formElement}
    >
      {(value, updateValue, showErrors, errors) => (
        <label>
          {name}
          {type === "list"
            ? <NormalizedList
              autoFocus={autofocus}
              placeholder={placeholder}
              items={value as unknown as Record<string, object> || {}}
              setItems={updateValue as unknown as (items: Record<string, object>) => void}
            />
            : type === "select" ? <select
              className="form-control"
              autoFocus={autofocus}
              value={value ?? ""}
              onChange={e => updateValue(e.target.value)}
            >
              <option value="">Select...</option>
              {(items as string[]).map((item: string) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
              : <TextInput
                autofocus={autofocus}
                placeholder={placeholder}
                value={value ?? ""}
                onChange={updateValue as unknown as (value: string | number) => void}
                type={type}
                onBlur={showErrors}
                className={`${errors.length > 0 ? "is-invalid " : ""}form-control mb-1`}
              />
          }
          {errors.length > 0 && (
            <ul className="errors">
              {errors.map((error, index) => (
                <li data-testid="error" key={index}>
                  {error}
                </li>
              ))}
            </ul>
          )}
        </label>
      )}
    </Leaf>
  );

  const renderedOther = otherFields.map(renderField);
  const renderedLists = listFields.length > 0 ? (
    <NormalizedListGrid key="normalized-list-grid">
      {listFields.map((f, i) => (
        <div key={`list-${i}`}>{renderField(f, 1000 + i)}</div>
      ))}
    </NormalizedListGrid>
  ) : null;

  return [...renderedOther, renderedLists].filter(Boolean) as JSX.Element[];
}
