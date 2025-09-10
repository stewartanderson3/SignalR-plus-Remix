import React from "react";
import { Form } from "../../forms/Form";
import { ActiveStepContextProvider, useActiveStep, useStepIteration } from "../../steps";
import FinancialChart from "./chart";
import {
  buildWageMonthlyIncomeChart,
  buildInvestmentBalanceAndWithdrawalChart,
  buildAnnuityMonthlyIncomeChart,
  buildTotalInvestmentAggregates
} from "./chart-builders";
import { get, useLocalStorageState } from "leaf-validator";

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
  const { stepApi, stepState } = useActiveStep<StepStateMeta, StepApi>();
  const [model, setModel] = useLocalStorageState<Record<string, unknown>>("retirement");
  const wageNames = Object.keys((model as any)?.wages?.items || {}).sort();
  const investmentNames = Object.keys((model as any)?.investments?.items || {}).sort();
  const annuityNames = Object.keys((model as any)?.annuities?.items || {}).sort();
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
          {
            name: "How many years do you want to plan for?",
            location: "yearsAfterRetire",
            validators: [Validators.required],
            type: "number"
          },
          {
            name: "Tax percentage (%)",
            location: "taxPercentage",
            validators: [Validators.required],
            type: "percent"
          },
          {
            name: "Inflation percentage (%)",
            location: "inflationPercentage",
            validators: [Validators.required],
            type: "percent"
          }
        ]} />
      </div>
    ),

    Setup: (
      <div className="card">
        <div className="card-header">Setup</div>
        <Form key="setup" model={model ?? {}} setModel={setModel} form={[
          { name: "Current Wages & Salaries", placeholder: "[Company Name]", location: "wages.items", validators: [Validators.required], type: "list" },
          { name: "Investments", placeholder: "[Investment Name]", location: "investments.items", validators: [Validators.required], type: "list" },
          { name: "Annuities", placeholder: "[Annuity Name]", location: "annuities.items", validators: [Validators.required], type: "list" }
        ]} />
      </div>
    ),

    ...wageNames.reduce((acc, wageName) => ({
      ...acc,
      [wageName]: (() => {
        const chartProps = buildWageMonthlyIncomeChart(wageName, model);
        return (
          <div className="card">
            <div className="card-header">Current Wages & Salaries</div>
            <div className="card-subheader">{wageName}</div>
            <div className="flex" style={{ gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 340px', maxWidth: 400 }}>
                <Form key={`wages.items.${wageName}`} model={model ?? {}} setModel={setModel} form={[
                  { name: "$ / year", location: `wages.items.${wageName}.annual`, validators: [Validators.required], type: "currency" },
                  { name: "Average Annual % Raise", location: `wages.items.${wageName}.raise`, validators: [Validators.required], type: "percent" },
                  {
                    name: "Anticipated Date to Stop Work",
                    location: `wages.items.${wageName}.stopWorkDate`,
                    validators: [Validators.required, Validators.isFutureOrCurrentDate],
                    type: "text"
                  },
                ]} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <FinancialChart {...chartProps} />
              </div>
            </div>
          </div>
        );
      })()
    }), {} as Record<string, JSX.Element>),

    ...investmentNames.reduce((acc, investmentName) => ({
      ...acc,
      [investmentName]: (() => {
        const { beginYear, endYear, balance, withdrawalSeries } = buildInvestmentBalanceAndWithdrawalChart(investmentName, model);
        return (
          <div className="card">
            <div className="card-header">Investments</div>
            <div className="card-subheader">{investmentName}</div>
            <div className="flex" style={{ gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 340px', maxWidth: 400 }}>
                <Form key={`investments.items.${investmentName}`} model={model ?? {}} setModel={setModel} form={[
                  { name: "Initial Balance", location: `investments.items.${investmentName}.balance`, validators: [Validators.required], type: "currency" },
                  { name: "Annual % Rate of Return", location: `investments.items.${investmentName}.rate`, validators: [Validators.required], type: "percent" },
                  {
                    name: "Start Taking Withdrawals Date",
                    location: `investments.items.${investmentName}.withdrawalDate`,
                    validators: [Validators.required, Validators.isDate],
                    type: "text"
                  },
                  {
                    name: "Annual Withdrawal Percentage (%)",
                    location: `investments.items.${investmentName}.withdrawalRate`,
                    validators: [Validators.required],
                    type: "percent"
                  },
                  wageNames.length > 0 ? {
                    name: "Contributions From",
                    location: `investments.items.${investmentName}.contributionsFrom`,
                    type: "select",
                    items: wageNames
                  } : null,
                  get(`investments.items.${investmentName}.contributionsFrom.length`).from(model) as any > 0
                    && wageNames.length > 0
                    ? {
                      name: "Annual Contribution Percentage (%)",
                      location: `investments.items.${investmentName}.contributionRate`,
                      validators: [Validators.required],
                      type: "percent"
                    }
                    : null
                ].filter(Boolean) as any} />
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <FinancialChart
                  beginYear={beginYear}
                  endYear={endYear}
                  valueLabel="Balance"
                  series={[balance]}
                />
                <FinancialChart
                  beginYear={beginYear}
                  endYear={endYear}
                  valueLabel="Monthly Withdrawal"
                  series={withdrawalSeries}
                />
              </div>
            </div>
          </div>
        );
      })()
    }), {} as Record<string, JSX.Element>),

    ...annuityNames.reduce((acc, annuityName) => ({
      ...acc,
      [annuityName]: (() => {
        const chartProps = buildAnnuityMonthlyIncomeChart(annuityName, model);
        return (
          <div className="card">
            <div className="card-header">Annuities</div>
            <div className="card-subheader">{annuityName}</div>
            <div className="flex" style={{ gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 340px', maxWidth: 400 }}>
                <Form key={`annuities.items.${annuityName}`} model={model ?? {}} setModel={setModel} form={[
                  { name: "$ / month", location: `annuities.items.${annuityName}.monthly`, validators: [], type: "currency" },
                  {
                    name: "Start Date",
                    location: `annuities.items.${annuityName}.startDate`,
                    validators: [Validators.required, Validators.isDate],
                    type: "text"
                  },
                ]} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <FinancialChart {...chartProps} />
              </div>
            </div>
          </div>
        );
      })()
    }), {} as Record<string, JSX.Element>),

    Summary: (
      <div className="card">
        <div className="card-header">Summary</div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {(() => {
              const agg = buildTotalInvestmentAggregates(model);
              const realBalance = agg.balanceSeries
                .filter(s => /After Tax & Inflation$/.test(s.name))
                .map(s => ({ ...s, strokeDasharray: undefined, color: '#059669', strokeWidth: 3 }));
              const realWithdrawal = agg.withdrawalSeries
                .filter(s => /After Tax & Inflation$/.test(s.name))
                .map(s => ({ ...s, strokeDasharray: undefined, color: '#059669', strokeWidth: 3 }));
              return (
                <>
                  {realWithdrawal.length > 0 && (
                    <FinancialChart
                      beginYear={agg.beginYear}
                      endYear={agg.endYear}
                      valueLabel="Real Monthly Withdrawal (After Tax & Inflation)"
                      series={realWithdrawal}
                    />
                  )}
                  {realBalance.length > 0 && (
                    <FinancialChart
                      beginYear={agg.beginYear}
                      endYear={agg.endYear}
                      valueLabel="Real Balance (After Tax & Inflation)"
                      series={realBalance}
                    />
                  )}
                  <FinancialChart
                    beginYear={agg.beginYear}
                    endYear={agg.endYear}
                    valueLabel="Monthly Withdrawal"
                    series={agg.withdrawalSeries}
                  />
                  <FinancialChart
                    beginYear={agg.beginYear}
                    endYear={agg.endYear}
                    valueLabel="Balance"
                    series={agg.balanceSeries}
                  />
                </>
              );
            })()}
          </div>
        </div>
      </div>
    )

  };

  const stepOrder = ([
    "Planning",
    "Setup",
    ...dynamicStepNames,
    dynamicStepNames.length > 0 ? "Summary" : null
  ].filter(Boolean) as string[]);

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
              {stepOrder.map((stepName: string, i) => (
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
            <div className="flex gap-sm" style={{ padding: '.25rem 0 0', alignItems: 'center' }}>
              {!isFirstStep && (
                <button
                  className="btn btn-secondary"
                  onClick={errorHandled(back)}
                  disabled={stepState?.isLoading}
                >
                  Back
                </button>
              )}
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
              {!isLastStep && (
                <button
                  className="btn btn-primary"
                  onClick={errorHandled(next)}
                  disabled={stepState?.isLoading || isLastStep}
                >
                  Next
                </button>
              )}
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
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <ActiveStepContextProvider>
      <div className="flex flex-col gap-md">
        {/* <FinancialChart
          beginYear={beginYear}
          endYear={endYear}
          valueLabel="Income / Net Worth"
          series={[
            { name: 'Projected Wages', values: wagesSeries, strokeDasharray: '4 4' },
            { name: 'Projected Net Worth', values: netWorthSeries, strokeWidth: 3 }
          ]}
        /> */}
        <Steps />
      </div>
    </ActiveStepContextProvider>
  );
}
