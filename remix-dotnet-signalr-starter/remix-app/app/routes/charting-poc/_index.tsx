import React from "react";
import { Form } from "../../forms/Form";
import { ActiveStepContextProvider, useActiveStep, useStepIteration } from "../../steps";
import ChartingPOC from "./chart";
import { useLocalStorageState } from "leaf-validator";

const errorHandled = (action: () => Promise<void>) => async (): Promise<void> => {
  try {
    await action();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(error);
  }
};

interface StepStateMeta {
  isLoading: boolean;
  isSkippable: boolean;
}

interface StepApi {
  submit?: () => Promise<void>;
}

const Validators = {
  required: (value: string | undefined | null) =>
    (value === null || value === undefined) && ["Value is required"],
  isDate: (value: string | undefined | null) => value && /^\d{2}\/\d{2}\/\d{4}$/.test(value.toString())
    ? false
    : ["Date must be in MM/DD/YYYY format"],
  isFutureOrCurrentDate: (value: string | undefined | null) => {
    if (!value || !/^\d{2}\/\d{2}\/\d{4}$/.test(value.toString())) return ["Date must be in MM/DD/YYYY format"];
    const parts = value.split('/');
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);

    // Guard against invalid dates like 02/30/2025 which JS normalizes (month/day rollover)
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
      return ["Date is not a valid calendar day"];
    }

    // Normalize 'now' to the start of today so that the current calendar date passes.
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return date >= today ? false : ["Date must be in the future or current"];
  }
}

function Steps(): JSX.Element {
  // const [skipGoToHandler, setSkipGoToHandler] = React.useState<boolean>(false);
  const { stepApi, stepState } = useActiveStep<StepStateMeta, StepApi>();
  const [model, setModel] = useLocalStorageState<Record<string, unknown>>("retirement");
  const wageNames = Object.keys(model?.wages ?? {}).sort();
  const investmentNames = Object.keys(model?.investments ?? {}).sort();
  const annuityNames = Object.keys(model?.annuities ?? {}).sort();
  const dynamicStepNames = [
    ...wageNames,
    ...investmentNames,
    ...annuityNames
  ];

  const steps: Record<string, JSX.Element> = {
    Planning: (
      <div className="card">
        <div className="card-header">Pre-Planning</div>
        <Form key="planning" model={model ?? {}} setModel={setModel} form={[
          {
            name: "Retirement Date",
            location: "retireDate",
            validators: [Validators.required, Validators.isFutureOrCurrentDate],
            type: "text"
          },
        ]} />
      </div>
    ),

    Setup: (
      <div className="card">
        <div className="card-header">Setup</div>
        <Form key="setup" model={model ?? {}} setModel={setModel} form={[
          { name: "Current Wages & Salaries", placeholder: "[Company Name]", location: "wages", validators: [Validators.required], type: "list" },
          { name: "Investments", placeholder: "[Investment Name]", location: "investments", validators: [Validators.required], type: "list" },
          { name: "Annuities", placeholder: "[Annuity Name]", location: "annuities", validators: [Validators.required], type: "list" }
        ]} />
      </div>
    ),

    ...wageNames.reduce((acc, wageName) => ({
      ...acc,
      [wageName]: <div className="card">
        <div className="card-header">Current Wages & Salaries</div>
        <div className="card-subheader">{wageName}</div>
        <Form key={`wages.${wageName}`} model={model ?? {}} setModel={setModel} form={[
          { name: "$ / year", location: `wages.${wageName}.annual`, validators: [Validators.required], type: "currency" },
          { name: "Average Annual % Raise", location: `wages.${wageName}.raise`, validators: [Validators.required], type: "percent" },
          {
            name: "Anticipated Date to Stop Work",
            location: `wages.${wageName}.stopWorkDate`,
            validators: [Validators.required, Validators.isFutureOrCurrentDate],
            type: "text"
          },
        ]} />
      </div>
    }), {} as Record<string, JSX.Element>),

    ...investmentNames.reduce((acc, investmentName) => ({
      ...acc,
      [investmentName]: <div className="card">
        <div className="card-header">Investments</div>
        <div className="card-subheader">{investmentName}</div>
        <Form key={`investments.${investmentName}`} model={model ?? {}} setModel={setModel} form={[
          { name: "Initial Balance", location: `investments.${investmentName}.balance`, validators: [Validators.required], type: "currency" },
          { name: "Annual % Rate of Return", location: `investments.${investmentName}.rate`, validators: [Validators.required], type: "percent" },
          {
            name: "Start Taking Withdrawals Date",
            location: `investments.${investmentName}.withdrawalDate`,
            validators: [Validators.required, Validators.isDate],
            type: "text"
          },
        ]} />
      </div>
    }), {} as Record<string, JSX.Element>),

    ...annuityNames.reduce((acc, annuityName) => ({
      ...acc,
      [annuityName]: <div className="card">
        <div className="card-header">Annuities</div>
        <div className="card-subheader">{annuityName}</div>
        <Form key={`annuities.${annuityName}`} model={model ?? {}} setModel={setModel} form={[
          { name: "$ / month", location: `annuities.${annuityName}.monthly`, validators: [], type: "currency" },
          {
            name: "Start Date",
            location: `annuities.${annuityName}.startDate`,
            validators: [Validators.required, Validators.isDate],
            type: "text"
          },
        ]} />
      </div>
    }), {} as Record<string, JSX.Element>),

  };

  const stepOrder = ["Planning", "Setup", ...dynamicStepNames];

  const {
    activeStep,
    activeStepName,
    next,
    back,
    skip,
    goTo,
    isFirstStep,
    isLastStep,
  } = useStepIteration({
    steps,
    order: stepOrder,
    onNext: () => stepApi.current?.submit?.(),
    onGoTo: () => stepApi.current?.submit?.(),
  });

  const currentIndex = stepOrder.findIndex((s) => s === activeStepName);
  const progress = ((currentIndex + 1) / stepOrder.length) * 100;

  return (
    <div className="flex flex-col gap-md">
      <div className="card" style={{ padding: '1.25rem 1.25rem 1rem' }}>
        {stepState?.isLoading && (
          <div className="loading-indicator loading-indicator--floating" aria-live="polite">Saving…</div>
        )}
        <div className="flex space-between align-center">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', flex: 1 }}>
            <div className="stepper" role="tablist" aria-label="Wizard Steps">
              {stepOrder.map((stepName, i) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeStepName === stepName}
                  aria-controls={`step-panel-${stepName}`}
                  key={stepName}
                  data-index={i + 1}
                  data-active={activeStepName === stepName}
                  className="step-pill"
                  // onClick={errorHandled(() => goTo({ stepName, skipGoToHandler }))}
                  onClick={errorHandled(() => goTo({ stepName, skipGoToHandler: false }))}
                >
                  {stepName}
                </button>
              ))}
            </div>
            <div className="progress" aria-label="Progress">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <div className="step-meta">
              Step {currentIndex + 1} of {stepOrder.length} ({activeStepName})
            </div>
          </div>
        </div>
      </div>

      <div id={`step-panel-${activeStepName}`}>{activeStep}</div>

      <div className="card" role="group" aria-label="Primary navigation actions">
        <div className="flex gap-sm" style={{ padding: '0.25rem 0.25rem 0', alignItems: 'center' }}>
          {!isFirstStep && <button
            className="btn btn-secondary"
            onClick={errorHandled(back)}
            disabled={stepState?.isLoading}
          >
            Back
          </button>}
          <div style={{ flex: 1 }} />
          {/* {stepState?.isSkippable && (
            <button
              className="btn btn-link"
              onClick={errorHandled(skip)}
              disabled={stepState?.isLoading || isLastStep}
            >
              Skip
            </button>
          )} */}
          {!isLastStep && <button
            className="btn btn-primary"
            onClick={errorHandled(next)}
            disabled={stepState?.isLoading || isLastStep}
          >
            Next
          </button>}
        </div>
      </div>

      <ChartingPOC />
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <ActiveStepContextProvider>
      <Steps />
    </ActiveStepContextProvider>
  );
}
