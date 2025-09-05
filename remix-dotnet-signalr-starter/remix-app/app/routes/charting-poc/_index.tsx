import React from "react";
import { ContactForm, AddressForm } from "../../forms/Form";
import { ActiveStepContextProvider, useActiveStep, useStepIteration } from "../../steps";

const errorHandled = (action: () => Promise<void>) => async (): Promise<void> => {
  try {
    await action();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(error);
  }
};

interface UselessStepProps {
  name: string;
}

const UselessStep: React.FC<UselessStepProps> = ({ name }) => (
  <div className="card" data-testid={`useless-step-${name}`}>
    <div className="card-header">Informational Step</div>
    <p className="text-muted" style={{marginTop:0}}>This is a placeholder ("{name}") to simulate optional workflow content.</p>
    <p className="step-meta">You can reorder or skip steps using the controls below.</p>
  </div>
);

const stepOrderOne = [
  "contact",
  "uselessOne",
  "address",
  "uselessTwo",
  "uselessThree",
] as const;
const stepOrderTwo = ["contact", "uselessTwo", "uselessThree"] as const;

type StepName = typeof stepOrderOne[number];
type StepOrder = readonly StepName[];

interface StepStateMeta {
  isLoading: boolean;
  isSkippable: boolean;
}

interface StepApi {
  submit?: () => Promise<void>;
}

function Steps(): JSX.Element {
  const [stepOrder, setStepOrder] = React.useState<StepOrder>(stepOrderOne);
  const [skipGoToHandler, setSkipGoToHandler] = React.useState<boolean>(false);
  const { stepApi, stepState } = useActiveStep<StepStateMeta, StepApi>();

  const steps: Record<StepName, JSX.Element> = {
    contact: (
      <div className="card">
        <div className="card-header">Contact Information</div>
        <ContactForm />
      </div>
    ),
    uselessOne: <UselessStep name="one" />,
    address: (
      <div className="card">
        <div className="card-header">Address Details</div>
        <AddressForm />
      </div>
    ),
    uselessTwo: <UselessStep name="two" />,
    uselessThree: <UselessStep name="three" />,
  };

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
    order: stepOrder as StepName[],
    onNext: () => stepApi.current?.submit?.(),
  onGoTo: () => stepApi.current?.submit?.(),
  });

  const toggleStepOrder = (): void => {
    setStepOrder((order) => (order === stepOrderOne ? stepOrderTwo : stepOrderOne));
  };

  const currentIndex = stepOrder.findIndex((s) => s === activeStepName);
  const progress = ((currentIndex + 1) / stepOrder.length) * 100;

  return (
    <div className="flex flex-col gap-md">
      <div className="card" style={{padding: '1.25rem 1.25rem 1rem'}}>
        {stepState?.isLoading && (
          <div className="loading-indicator loading-indicator--floating" aria-live="polite">Saving…</div>
        )}
        <div className="flex space-between align-center">
          <div style={{display:'flex', flexDirection:'column', gap:'.5rem', flex:1}}>
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
                  onClick={errorHandled(() => goTo({ stepName, skipGoToHandler }))}
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
          {stepState?.isSkippable && (
            <button
              className="btn btn-link"
              onClick={errorHandled(skip)}
              disabled={stepState?.isLoading || isLastStep}
            >
              Skip
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={errorHandled(next)}
            disabled={stepState?.isLoading || isLastStep}
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
          <div style={{flex:1}} />
          <button className="btn" onClick={toggleStepOrder} type="button">
            Order: {stepOrder === stepOrderOne ? "One" : "Two"}
          </button>
          <label style={{display:'flex', alignItems:'center', gap:'.35rem', fontSize:'.7rem'}}>
            <input
              type="checkbox"
              onChange={() => setSkipGoToHandler((skipGoToHandler) => !skipGoToHandler)}
              checked={skipGoToHandler}
            />
            <span className="text-muted">Skip GoTo submit</span>
          </label>
        </div>
      </div>

      <div id={`step-panel-${activeStepName}`}>{activeStep}</div>
    </div>
  );
}

const ManagedActiveStepProvider = ActiveStepContextProvider as unknown as React.FC<React.PropsWithChildren>;

export default function App(): JSX.Element {
  return (
    <ManagedActiveStepProvider>
      <Steps />
    </ManagedActiveStepProvider>
  );
}
