import React, { useEffect, useState } from "react";
import {
  Leaf,
  useValidationModel,
  useLoadingState,
  useErrorHandler,
  useLocalStorageState,
} from "leaf-validator";
import { TextInput } from "./TextInput";
import { useActiveStep } from "../steps";

type Validator = (value: string | undefined | null) => false | string[];

interface FormField {
  name: string;
  location: string; // dot path into model
  validators: Validator[];
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

const isRequired: Validator = (value) =>
  (!value || value.toString().trim() === "") && ["Value is required"];
const isValidEmailAddress: Validator = (value) => {
  if (!value) return false; // let required handle empty
  return !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value.toString())
    ? [`"${value || ""}" is not a valid email address`]
    : false;
};
const isValidPhoneNumber: Validator = (value) => {
  if (!value) return false;
  return !/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(value.toString())
    ? [`"${value || ""}" is not a valid phone number`]
    : false;
};

const contactForm: FormField[] = [
  {
    name: "First Name",
    location: "person.firstName",
    validators: [isRequired],
  },
  {
    name: "Last Name",
    location: "person.lastName",
    validators: [isRequired],
  },
  {
    name: "Email",
    location: "person.contact.email",
    validators: [isRequired, isValidEmailAddress],
  },
  {
    name: "Phone Number",
    location: "person.contact.phoneNumber",
    validators: [isRequired, isValidPhoneNumber],
  },
];

const addressForm: FormField[] = [
  {
    name: "Street Address",
    location: "person.address.street",
    validators: [isRequired],
  },
  {
    name: "City",
    location: "person.address.city",
    validators: [isRequired],
  },
  {
    name: "State",
    location: "person.address.state",
    validators: [isRequired],
  },
  {
    name: "Zip Code",
    location: "person.address.zip",
    validators: [isRequired],
  },
];

const fakeSendDataToServer = (data: SubmitPayload): Promise<void> => {
  console.log("saved", data);
  return new Promise((resolve) => setTimeout(resolve, 2000));
};

export function ContactForm(): JSX.Element {
  return <Form form={contactForm} />;
}

export function AddressForm(): JSX.Element {
  return <Form form={addressForm} />;
}

interface FormProps {
  form: FormField[];
}

function Form({ form }: FormProps): JSX.Element {
  const { stepApi, setStepState } = useActiveStep<StepStateMeta, StepApi>();
  // Assuming useLocalStorageState takes a key and returns [value, setter]
  const [model = {}, setModel] = useLocalStorageState<Record<string, unknown>>("form");
  const validationModel = useValidationModel();
  const [showAllValidation, setShowAllValidation] = useState(false);
  const { clearError, errorHandler, errors } = useErrorHandler();
  const [isSubmitting, showSubmittingWhile] = useLoadingState({ errorHandler });
  const submit = async (event?: React.FormEvent): Promise<void> => {
    if (event) event.preventDefault();
    setShowAllValidation(true);
    if (validationModel.getAllErrorsForLocation("").length === 0) {
  await showSubmittingWhile(fakeSendDataToServer({ model: model!, form }));
    }

    const hasErrors = validationModel.getAllErrorsForLocation("").length > 0;
    if (hasErrors) throw new Error("Has validation errors");
  };

  stepApi.current = { submit };

  useEffect(() => {
    setStepState({ isLoading: isSubmitting, isSkippable: true });
  }, [isSubmitting, setStepState]);

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
  return form.map(({ name, ...formElement }, index) => (
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
          <TextInput
            value={value ?? ""}
            onChange={updateValue}
            onBlur={showErrors}
            className={`${
              errors.length > 0 ? "is-invalid " : ""
            }form-control mb-1`}
          />
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
  ));
}
