import React from "react";
import { Form } from "../../forms/Form";
import { ActiveStepContextProvider, useActiveStep, useStepIteration } from "../../steps";
import FinancialChart from "./chart";
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

function buildWageMonthlyIncomeChart(wageName: string, model: any): {
  beginYear: number;
  endYear: number;
  valueLabel: string;
  series: { name: string; values: Record<number, number>; strokeWidth: number }[];
} {
  const wageData: any = model?.wages?.[wageName] || {};
  const annual: number = Number(wageData?.annual) || 0;
  const raise: number = Number(wageData?.raise) || 0; // decimal form (0.02 = 2%)
  const stopWorkDateStr: string | undefined = wageData?.stopWorkDate;
  const beginYear = new Date().getFullYear();
  let endYear = beginYear;
  if (stopWorkDateStr && /\d{2}\/\d{2}\/\d{4}/.test(stopWorkDateStr)) {
    endYear = Number(stopWorkDateStr.split('/')[2]) || beginYear;
  }
  if (endYear < beginYear) endYear = beginYear; // guard
  const values: Record<number, number> = {};
  for (let y = beginYear; y <= endYear; y++) {
    const growthFactor = Math.pow(1 + raise, y - beginYear);
    const monthlyIncome = annual * growthFactor / 12;
    values[y] = Math.round(monthlyIncome);
  }
  return {
    beginYear,
    endYear,
    valueLabel: 'Monthly Income',
    series: [{ name: `${wageName} - Monthly Income`, values, strokeWidth: 3 }]
  };
}

/**
 * Build investment projection chart:
 * - Balance growth with annual compounding and withdrawals after withdrawalDate.
 * - Monthly withdrawal income line starting at withdrawal year.
 * Assumptions:
 *   * Withdrawals taken at end of year after growth based on starting balance of that year.
 *   * Monthly withdrawal displayed = annual withdrawal / 12 rounded.
 *   * Balance never drops below 0 (withdrawal capped if necessary).
 */
function buildInvestmentBalanceAndWithdrawalChart(investmentName: string, model: any): {
  beginYear: number;
  endYear: number;
  balance: { name: string; values: Record<number, number>; strokeWidth?: number };
  withdrawal: { name: string; values: Record<number, number | null>; strokeDasharray?: string; strokeWidth?: number };
} {
  const investment: any = model?.investments?.[investmentName] || {};
  const initialBalance: number = Number(investment?.balance) || 0;
  const rate: number = Number(investment?.rate) || 0; // decimal form
  const withdrawalDateStr: string | undefined = investment?.withdrawalDate; // MM/DD/YYYY
  const withdrawalRate: number = Number(investment?.withdrawalRate) || 0; // decimal form
  const retireDateStr: string | undefined = model?.retireDate;
  const yearsAfterRetire: number = Number(model?.yearsAfterRetire) || 0;
  const nowYear = new Date().getFullYear();
  let retireYear: number | undefined;
  if (retireDateStr && /\d{2}\/\d{2}\/\d{4}/.test(retireDateStr)) retireYear = Number(retireDateStr.split('/')[2]);
  const endYear = retireYear ? retireYear + yearsAfterRetire : nowYear + 10; // fallback horizon
  const beginYear = nowYear;
  let withdrawalYear: number | undefined;
  if (withdrawalDateStr && /\d{2}\/\d{2}\/\d{4}/.test(withdrawalDateStr)) withdrawalYear = Number(withdrawalDateStr.split('/')[2]);

  const balanceValues: Record<number, number> = {};
  const withdrawalMonthlyValues: Record<number, number | null> = {};

  let balanceStartOfYear = initialBalance; // starting balance for current year (end of previous year)
  for (let y = beginYear; y <= endYear; y++) {
    // grow
    const growthAmount = balanceStartOfYear * rate;
    let balanceAfterGrowth = balanceStartOfYear + growthAmount;
    // withdrawal (if within or after withdrawalYear)
    let withdrawalAnnual = 0;
    if (withdrawalYear !== undefined && y >= withdrawalYear && withdrawalRate > 0) {
      withdrawalAnnual = balanceStartOfYear * withdrawalRate; // based on starting balance assumption
      if (withdrawalAnnual > balanceAfterGrowth) withdrawalAnnual = balanceAfterGrowth; // cap
      balanceAfterGrowth -= withdrawalAnnual;
      withdrawalMonthlyValues[y] = Math.round(withdrawalAnnual / 12);
    } else {
      withdrawalMonthlyValues[y] = null; // null so line starts at first withdrawal year
    }
    balanceValues[y] = Math.round(balanceAfterGrowth);
    balanceStartOfYear = balanceAfterGrowth; // next loop
  }

  return {
    beginYear,
    endYear,
    balance: { name: `${investmentName} Balance`, values: balanceValues, strokeWidth: 3 },
    withdrawal: { name: `${investmentName} Monthly Withdrawal`, values: withdrawalMonthlyValues, strokeDasharray: '4 4' }
  };
}

/**
 * Build annuity monthly income chart:
 * - Shows monthly payment beginning at startDate year through planning horizon (retireYear + yearsAfterRetire or +10 fallback).
 * - Years before start year are null so the line begins cleanly.
 */
function buildAnnuityMonthlyIncomeChart(annuityName: string, model: any): {
  beginYear: number;
  endYear: number;
  valueLabel: string;
  series: { name: string; values: Record<number, number | null>; strokeWidth?: number }[];
} {
  const annuity: any = model?.annuities?.[annuityName] || {};
  const monthly: number = Number(annuity?.monthly) || 0;
  const startDateStr: string | undefined = annuity?.startDate;
  const nowYear = new Date().getFullYear();
  const retireDateStr: string | undefined = model?.retireDate;
  const yearsAfterRetire: number = Number(model?.yearsAfterRetire) || 0;
  let retireYear: number | undefined;
  if (retireDateStr && /\d{2}\/\d{2}\/\d{4}/.test(retireDateStr)) retireYear = Number(retireDateStr.split('/')[2]);
  const endYear = retireYear ? retireYear + yearsAfterRetire : nowYear + 10;
  const beginYear = nowYear;
  let startYear: number | undefined;
  if (startDateStr && /\d{2}\/\d{2}\/\d{4}/.test(startDateStr)) startYear = Number(startDateStr.split('/')[2]);
  const values: Record<number, number | null> = {};
  for (let y = beginYear; y <= endYear; y++) {
    if (startYear !== undefined && y >= startYear) {
      values[y] = monthly ? Math.round(monthly) : 0;
    } else {
      values[y] = null; // so line starts at first payment year
    }
  }
  return {
    beginYear,
    endYear,
    valueLabel: 'Monthly Income',
    series: [{ name: `${annuityName} Monthly Income`, values, strokeWidth: 3 }]
  };
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
          {
            name: "How many years do you want to plan for?",
            location: "yearsAfterRetire",
            validators: [Validators.required],
            type: "number"
          }
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
      [wageName]: (() => {
        const chartProps = buildWageMonthlyIncomeChart(wageName, model);
        return (
          <div className="card">
            <div className="card-header">Current Wages & Salaries</div>
            <div className="card-subheader">{wageName}</div>
            <div className="flex" style={{ gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 340px', maxWidth: 400 }}>
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
        const { beginYear, endYear, balance, withdrawal } = buildInvestmentBalanceAndWithdrawalChart(investmentName, model);
        return (
          <div className="card">
            <div className="card-header">Investments</div>
            <div className="card-subheader">{investmentName}</div>
            <div className="flex" style={{ gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 340px', maxWidth: 400 }}>
                <Form key={`investments.${investmentName}`} model={model ?? {}} setModel={setModel} form={[
                  { name: "Initial Balance", location: `investments.${investmentName}.balance`, validators: [Validators.required], type: "currency" },
                  { name: "Annual % Rate of Return", location: `investments.${investmentName}.rate`, validators: [Validators.required], type: "percent" },
                  {
                    name: "Start Taking Withdrawals Date",
                    location: `investments.${investmentName}.withdrawalDate`,
                    validators: [Validators.required, Validators.isDate],
                    type: "text"
                  },
                  {
                    name: "Annual Withdrawal Percentage (%)",
                    location: `investments.${investmentName}.withdrawalRate`,
                    validators: [Validators.required],
                    type: "percent"
                  }
                ]} />
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
                  series={[withdrawal]}
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <FinancialChart {...chartProps} />
              </div>
            </div>
          </div>
        );
      })()
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
    </div>
  );
}

export default function App(): JSX.Element {
  // Simple derived chart example (placeholder): Use retire year + planning span if available
  // This is intentionally lightweight; real implementation should derive monthly/yearly income & net worth projections
  const [model] = useLocalStorageState<Record<string, any>>("retirement");
  const retireDateStr: string | undefined = model?.retireDate;
  let retireYear: number | undefined;
  if (retireDateStr && /\d{2}\/\d{2}\/\d{4}/.test(retireDateStr)) {
    retireYear = Number(retireDateStr.split('/')[2]);
  }
  const yearsAfter: number = Number(model?.yearsAfterRetire) || 10;
  const beginYear = new Date().getFullYear();
  const endYear = retireYear ? retireYear + yearsAfter : beginYear + yearsAfter;

  // Mock series: wages decline, net worth grows (placeholder logic)
  const wagesSeries: Record<number, number> = {};
  const netWorthSeries: Record<number, number> = {};
  let wageBase = 0;
  const wageEntries = Object.values(model?.wages || {}) as any[];
  if (wageEntries.length) {
    wageBase = wageEntries.reduce((acc, w: any) => acc + (Number(w?.annual) || 0), 0);
  }
  let netWorth: number = (Object.values(model?.investments || {}) as any[]).reduce((acc: number, inv: any) => acc + (Number(inv?.balance) || 0), 0);
  for (let y = beginYear; y <= endYear; y++) {
    const isRetired = retireYear ? y >= retireYear : false;
    wagesSeries[y] = wageBase ? Math.max(0, Math.round(wageBase * (isRetired ? 0.15 : 1 - (y - beginYear) * 0.03))) : 0;
    netWorth = Math.round(netWorth * 1.05 + (wagesSeries[y] * 0.15));
    netWorthSeries[y] = netWorth;
  }

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
