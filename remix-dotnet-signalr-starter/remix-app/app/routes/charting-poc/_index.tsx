import React from "react";
import { ContactForm, AddressForm } from "../../forms/Form";
import {
  ActiveStepContextProvider,
  useActiveStep,
  useStepIteration,
} from "../../steps";

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
  <h1>Useless Step: {name}</h1>
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
    contact: <ContactForm />,
    uselessOne: <UselessStep name="one" />,
    address: <AddressForm />,
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

  return (
    <>
      <div>{activeStep}</div>
      <div>
        <button
          className="btn btn-primary ml-3"
          onClick={errorHandled(back)}
          disabled={stepState?.isLoading || isFirstStep}
        >
          Back
        </button>
        {stepState?.isSkippable && (
          <button
            className="btn btn-secondary ml-2"
            onClick={errorHandled(skip)}
            disabled={stepState?.isLoading || isLastStep}
          >
            Skip
          </button>
        )}
        <button
          className="btn btn-primary ml-2"
          onClick={errorHandled(next)}
          disabled={stepState?.isLoading || isLastStep}
        >
          Next
        </button>
        {stepState?.isLoading && <strong className="ml-2">Loading...</strong>}
      </div>
      <div>
        <button className="btn btn-primary ml-3 mt-3" onClick={toggleStepOrder}>
          Using Step Order: {stepOrder === stepOrderOne ? "One" : "Two"}
        </button>
      </div>
      <div className="ml-3 mt-3">
        <strong>Step Order</strong>
        <p>
          <label>
            <input
              type="checkbox"
              onChange={() =>
                setSkipGoToHandler((skipGoToHandler) => !skipGoToHandler)
              }
            />{" "}
            Skip GoTo Handler
          </label>
        </p>
        <p>
          {stepOrder.map((stepName) => (
            <button
              key={stepName}
              className="btn btn-link"
              onClick={errorHandled(() => goTo({ stepName, skipGoToHandler }))}
            >
              {activeStepName === stepName ? (
                <strong>{stepName}</strong>
              ) : (
                stepName
              )}
            </button>
          ))}
        </p>
      </div>
    </>
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
