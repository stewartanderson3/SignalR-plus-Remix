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
    (!value || value.toString().trim() === "") && ["Value is required"],
  isDate: (value: string | undefined | null) => value && /^\d{2}\/\d{2}\/\d{4}$/.test(value.toString())
    ? false
    : ["Date must be in MM/DD/YYYY format"]
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
    Setup: (
      <div className="card">
        <div className="card-header">Setup</div>
        <Form model={model ?? {}} setModel={setModel} form={[
          { name: "Wages", placeholder: "[Company Name]", location: "wages", validators: [Validators.required], type: "list" },
          { name: "Investments", placeholder: "[Investment Name]", location: "investments", validators: [Validators.required], type: "list" },
          { name: "Annuities", placeholder: "[Annuity Name]", location: "annuities", validators: [Validators.required], type: "list" }
        ]} />
      </div>
    ),

    ...wageNames.reduce((acc, wageName) => ({
      ...acc,
      [wageName]: <Form model={model ?? {}} setModel={setModel} form={[
        { name: "$ / year", location: `wages.${wageName}.annual`, validators: [Validators.required], type: "currency" },
        { name: "Average Annual % Raise", location: `wages.${wageName}.raise`, validators: [Validators.required], type: "percent" },
        { name: "Anticipated Date of Retirement", location: `wages.${wageName}.retireDate`, validators: [Validators.required, Validators.isDate], type: "text" },
      ]} />
    }), {} as Record<string, JSX.Element>),

    ...investmentNames.reduce((acc, investmentName) => ({
      ...acc,
      [investmentName]: <Form model={model ?? {}} setModel={setModel} form={[
        { name: "Initial Balance", location: `investments.${investmentName}.balance`, validators: [Validators.required], type: "currency" },
        { name: "Annual % Rate of Return", location: `investments.${investmentName}.rate`, validators: [Validators.required], type: "percent" },
      ]} />
    }), {} as Record<string, JSX.Element>),

    ...annuityNames.reduce((acc, annuityName) => ({
      ...acc,
      [annuityName]: <Form model={model ?? {}} setModel={setModel} form={[
        { name: "$ / month", location: `annuities.${annuityName}.monthly`, validators: [], type: "currency" },
      ]} />
    }), {} as Record<string, JSX.Element>),

  };

  const stepOrder = ["Setup", ...dynamicStepNames];

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
    order: ["Setup", ...dynamicStepNames],
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
        <div className="flex gap-sm mt-sm" role="group" aria-label="Primary navigation actions">
          <button
            className="btn btn-secondary"
            onClick={errorHandled(back)}
            disabled={stepState?.isLoading || isFirstStep}
          >
            Back
          </button>
          {/* {stepState?.isSkippable && (
            <button
              className="btn btn-link"
              onClick={errorHandled(skip)}
              disabled={stepState?.isLoading || isLastStep}
            >
              Skip
            </button>
          )} */}
          <button
            className="btn btn-primary"
            onClick={errorHandled(next)}
            disabled={stepState?.isLoading || isLastStep}
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
          {/* <div style={{ flex: 1 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.7rem' }}>
            <input
              type="checkbox"
              onChange={() => setSkipGoToHandler((skipGoToHandler) => !skipGoToHandler)}
              checked={skipGoToHandler}
            />
            <span className="text-muted">Skip GoTo submit</span>
          </label> */}
        </div>
      </div>

      <div id={`step-panel-${activeStepName}`}>{activeStep}</div>

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
