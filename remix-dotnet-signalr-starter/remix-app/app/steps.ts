import { createManagedContext } from "leaf-validator";
import { useState, useRef, type MutableRefObject, type Dispatch, type SetStateAction } from "react";

export interface StepContextValue<State = unknown, Api = unknown> {
  stepApi: MutableRefObject<Api | null>;
  stepState: State | null;
  setStepState: Dispatch<SetStateAction<State | null>>;
}

const [BaseActiveStepContextProvider, useRawActiveStep] = createManagedContext<StepContextValue, unknown>(
  () => {
    const stepApi = useRef<unknown | null>(null);
    const [stepState, setStepState] = useState<unknown | null>(null);

    return {
      stepApi,
      stepState,
      setStepState,
    } as StepContextValue;
  }
);

type ProviderProps = React.ComponentProps<typeof BaseActiveStepContextProvider>;
type OptionalProvider = React.FC<Partial<ProviderProps>>;

export const ActiveStepContextProvider = BaseActiveStepContextProvider as unknown as OptionalProvider;
export { useRawActiveStep };

export const useActiveStep = <State = unknown, Api = unknown>(): StepContextValue<State, Api> =>
  useRawActiveStep() as StepContextValue<State, Api>;

export type AsyncMaybe = void | Promise<void>;

export interface GoToOptions<TStepName extends string> {
  stepName: TStepName;
  /** If true, suppress calling onGoTo handler */
  skipGoToHandler?: boolean;
}

type StepKey<TSteps extends Record<string, any>> = Extract<keyof TSteps, string>;

export interface StepIterationParams<TSteps extends Record<string, any>> {
  /** Map of step name to step data/component */
  steps: TSteps;
  /** Order of steps (must be keys of steps) */
  order: StepKey<TSteps>[];
  onNext?: () => AsyncMaybe;
  onBack?: () => AsyncMaybe;
  onGoTo?: () => AsyncMaybe;
  onSkip?: () => AsyncMaybe;
}

export interface StepIterationResult<TSteps extends Record<string, any>> {
  activeStepName: StepKey<TSteps> | undefined;
  activeStep: TSteps[StepKey<TSteps>] | undefined;
  stepIndex: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  next: () => Promise<void>;
  back: () => Promise<void>;
  skip: () => Promise<void>;
  goTo: (opts: GoToOptions<StepKey<TSteps>>) => Promise<void>;
}

export function useStepIteration<TSteps extends Record<string, any>>({
  steps,
  order,
  onNext,
  onBack,
  onGoTo,
  onSkip,
}: StepIterationParams<TSteps>): StepIterationResult<TSteps> {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const { stepApi, setStepState } = useActiveStep();

  const goForward = async (handler?: () => AsyncMaybe): Promise<void> => {
    if (handler) await handler();
    stepApi.current = null;
    setStepIndex((index) => (index < order.length - 1 ? index + 1 : index));
    setStepState(null);
  };

  const next = async (): Promise<void> => {
    await goForward(onNext);
  };

  const skip = async (): Promise<void> => {
    await goForward(onSkip);
  };

  const back = async (): Promise<void> => {
    if (onBack) await onBack();
    stepApi.current = null;
    setStepIndex((index) => (index > 0 ? index - 1 : index));
    setStepState(null);
  };

  const goTo = async ({ stepName, skipGoToHandler }: GoToOptions<StepKey<TSteps>>): Promise<void> => {
    const index = order.indexOf(stepName);
    if (index === -1) {
      throw new Error(`Step ${String(stepName)} not found in order`);
    }
    if (!skipGoToHandler && onGoTo) {
      await onGoTo();
    }
    stepApi.current = null;
    setStepIndex(index);
    setStepState(null);
  };

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex >= order.length - 1;
  const activeStepName = order?.[isLastStep ? order.length - 1 : stepIndex];

  return {
    activeStepName,
    activeStep: activeStepName ? steps?.[activeStepName] : undefined,
    stepIndex,
    isFirstStep,
    isLastStep,
    next,
    back,
    skip,
    goTo,
  };
}
