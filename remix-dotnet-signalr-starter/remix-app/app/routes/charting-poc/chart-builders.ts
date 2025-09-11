// Centralized chart builder utility functions extracted from _index.tsx
// Each function returns the data shape expected by the FinancialChart component.

// Defensive helper: user/model percent values should already be fractional (0.0925 for 9.25%).
// If a legacy or corrupted model stores 9.25 instead, we auto-normalize.
function normalizePct(val: any): number {
  const n = Number(val) || 0;
  if (!isFinite(n)) return 0;
  if (n > 1) return n / 100; // treat as whole percent
  if (n < -1) return n / 100; // negative percent edge
  return n;
}

export function buildWageMonthlyIncomeChart(wageName: string, model: any): {
  beginYear: number;
  endYear: number;
  valueLabel: string;
  series: { name: string; values: Record<number, number>; strokeWidth?: number; strokeDasharray?: string }[];
} {
  const wageData: any = (model as any)?.wages?.items?.[wageName] || {};
  const annual: number = Number(wageData?.annual) || 0;
  // Percent inputs are already stored as fractional decimals (e.g. 0.0925) by the percent TextInput component.
  const raise: number = normalizePct(wageData?.raise);
  const taxRate: number = normalizePct((model as any)?.taxPercentage);
  const inflRate: number = normalizePct((model as any)?.inflationPercentage);
  const stopWorkDateStr: string | undefined = wageData?.stopWorkDate;
  const beginYear = new Date().getFullYear();
  let endYear = beginYear;
  const planningHorizonYears = Number((model as any)?.planningHorizonYears) || undefined;
  if (stopWorkDateStr && /\d{2}\/\d{2}\/\d{4}/.test(stopWorkDateStr)) {
    endYear = Number(stopWorkDateStr.split('/')[2]) || beginYear;
  }
  if (planningHorizonYears && planningHorizonYears > 0) {
    endYear = beginYear + planningHorizonYears - 1;
  }
  if (endYear < beginYear) endYear = beginYear; // guard
  const grossValues: Record<number, number> = {};
  const afterTaxValues: Record<number, number> = {};
  const realAfterTaxValues: Record<number, number> = {};
  for (let y = beginYear; y <= endYear; y++) {
    const growthFactor = Math.pow(1 + raise, y - beginYear);
    const monthlyIncome = annual * growthFactor / 12;
    const gross = Math.round(monthlyIncome);
    const afterTax = Math.round(monthlyIncome * (1 - taxRate));
    const realAfterTax = Math.round(afterTax / Math.pow(1 + inflRate, y - beginYear));
    grossValues[y] = gross;
    afterTaxValues[y] = afterTax;
    realAfterTaxValues[y] = realAfterTax;
  }
  return {
    beginYear,
    endYear,
    valueLabel: 'Monthly Income',
    series: [
      { name: `${wageName} Gross`, values: grossValues, strokeWidth: 3 },
      { name: `${wageName} After Tax`, values: afterTaxValues, strokeDasharray: '5 4' },
      { name: `${wageName} After Tax & Inflation`, values: realAfterTaxValues, strokeDasharray: '2 3' }
    ]
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
export function buildInvestmentBalanceAndWithdrawalChart(investmentName: string, model: any): {
  beginYear: number;
  endYear: number;
  balance: { name: string; values: Record<number, number>; strokeWidth?: number };
  withdrawalSeries: { name: string; values: Record<number, number | null>; strokeDasharray?: string; strokeWidth?: number }[];
} {
  const investmentRoot: any = (model as any)?.investments;
  const investment: any = investmentRoot?.items?.[investmentName] || (investmentRoot && !('items' in investmentRoot) ? investmentRoot?.[investmentName] : {}) || {};
  const initialBalance: number = Number(investment?.balance) || 0;
  const rate: number = normalizePct(investment?.rate);
  const withdrawalDateStr: string | undefined = investment?.withdrawalDate; // MM/DD/YYYY
  const withdrawalRate: number = normalizePct(investment?.withdrawalRate);
  // New contributions inputs
  // contributionsFrom is a wage name (selected from wages list), not a date. We contribute a % of that wage's annual amount (with raises) each year until the wage stopWorkDate.
  const contributionsFromWage: string | undefined = investment?.contributionsFrom; // wage name
  const contributionRate: number = normalizePct(investment?.contributionRate);
  const taxRate: number = normalizePct((model as any)?.taxPercentage);
  const inflRate: number = normalizePct((model as any)?.inflationPercentage);
  const retireDateStr: string | undefined = model?.retireDate;
  const yearsAfterRetire: number = Number(model?.yearsAfterRetire) || 0;
  const planningHorizonYears = Number((model as any)?.planningHorizonYears) || undefined;
  const nowYear = new Date().getFullYear();
  const beginYear = nowYear;
  let retireYear: number | undefined;
  if (retireDateStr && /\d{2}\/\d{2}\/\d{4}/.test(retireDateStr)) retireYear = Number(retireDateStr.split('/')[2]);
  let endYear = retireYear ? retireYear + yearsAfterRetire : nowYear + 10; // fallback horizon
  if (planningHorizonYears && planningHorizonYears > 0) {
    endYear = beginYear + planningHorizonYears - 1;
  }
  let withdrawalYear: number | undefined;
  if (withdrawalDateStr && /\d{2}\/\d{2}\/\d{4}/.test(withdrawalDateStr)) withdrawalYear = Number(withdrawalDateStr.split('/')[2]);

  // Wage reference (if any) for contributions
  let wageAnnualBase = 0;
  let wageRaise = 0;
  let wageStopWorkYear: number | undefined;
  if (contributionsFromWage) {
    const wageData: any = (model as any)?.wages?.items?.[contributionsFromWage];
    if (wageData) {
      wageAnnualBase = Number(wageData.annual) || 0;
      wageRaise = normalizePct(wageData.raise);
      const swd: string | undefined = wageData.stopWorkDate;
      if (swd && /\d{2}\/\d{2}\/\d{4}/.test(swd)) wageStopWorkYear = Number(swd.split('/')[2]);
    }
  }

  const enableLegacyBalancePctFallback = false;

  const balanceValues: Record<number, number> = {};
  const withdrawalMonthlyValues: Record<number, number | null> = {};
  const withdrawalAfterTaxValues: Record<number, number | null> = {};
  const withdrawalRealAfterTaxValues: Record<number, number | null> = {};

  let balanceStartOfYear = initialBalance; // starting balance for current year (end of previous year)
  for (let y = beginYear; y <= endYear; y++) {
    // 1. Contribution at start of year.
    // If wage referenced: contribution = wageAnnualForYear * contributionRate (only through wage stopWorkYear).
    // Else (legacy fallback): contribution = starting balance * contributionRate.
    let contributionAnnual = 0;
    if (contributionRate > 0) {
      if (contributionsFromWage && wageAnnualBase > 0) {
        const withinWageYears = wageStopWorkYear === undefined || y <= wageStopWorkYear;
        if (withinWageYears) {
          const wageAnnualForYear = wageAnnualBase * Math.pow(1 + wageRaise, y - beginYear);
          contributionAnnual = wageAnnualForYear * contributionRate;
        }
      } else if (enableLegacyBalancePctFallback) {
        // Legacy (disabled) interpretation: percentage of starting balance each year (compounds contributions)
        contributionAnnual = balanceStartOfYear * contributionRate;
      }
    }
    const balanceAfterContribution = balanceStartOfYear + contributionAnnual;

    // 2. Growth on post-contribution balance (continuous compounding)
    // Continuous: A * e^{r} => growth portion = A * (e^{r} - 1)
    const growthAmount = balanceAfterContribution * (Math.exp(rate) - 1);
    let balanceAfterGrowth = balanceAfterContribution + growthAmount;


    // 3. Withdrawal (if within or after withdrawalYear)
    let withdrawalAnnual = 0;
    if (withdrawalYear !== undefined && y >= withdrawalYear && withdrawalRate > 0) {
      withdrawalAnnual = balanceStartOfYear * withdrawalRate; // based on starting balance assumption
      if (withdrawalAnnual > balanceAfterGrowth) withdrawalAnnual = balanceAfterGrowth; // cap
      balanceAfterGrowth -= withdrawalAnnual;
      const grossMonthly = withdrawalAnnual / 12;
      withdrawalMonthlyValues[y] = Math.round(grossMonthly);
      const afterTax = grossMonthly * (1 - taxRate);
      withdrawalAfterTaxValues[y] = Math.round(afterTax);
      const realAfterTax = afterTax / Math.pow(1 + inflRate, y - beginYear);
      withdrawalRealAfterTaxValues[y] = Math.round(realAfterTax);
    } else {
      withdrawalMonthlyValues[y] = null; // null so line starts at first withdrawal year
      withdrawalAfterTaxValues[y] = null;
      withdrawalRealAfterTaxValues[y] = null;
    }
    balanceValues[y] = Math.round(balanceAfterGrowth);
    balanceStartOfYear = balanceAfterGrowth; // next loop
  }

  return {
    beginYear,
    endYear,
    balance: { name: `${investmentName} Balance`, values: balanceValues, strokeWidth: 3 },
    withdrawalSeries: [
      { name: `${investmentName} Withdrawal Gross`, values: withdrawalMonthlyValues, strokeDasharray: '4 4' },
      { name: `${investmentName} Withdrawal After Tax`, values: withdrawalAfterTaxValues, strokeDasharray: '5 3' },
      { name: `${investmentName} Withdrawal After Tax & Inflation`, values: withdrawalRealAfterTaxValues, strokeDasharray: '2 3' }
    ]
  };
}

/**
 * Build annuity monthly income chart:
 * - Shows monthly payment beginning at startDate year through planning horizon (retireYear + yearsAfterRetire or +10 fallback).
 * - Years before start year are null so the line begins cleanly.
 */
export function buildAnnuityMonthlyIncomeChart(annuityName: string, model: any): {
  beginYear: number;
  endYear: number;
  valueLabel: string;
  series: { name: string; values: Record<number, number | null>; strokeWidth?: number; strokeDasharray?: string }[];
} {
  const annuity: any = (model as any)?.annuities?.items?.[annuityName] || {};
  const monthly: number = Number(annuity?.monthly) || 0;
  const startDateStr: string | undefined = annuity?.startDate;
  const nowYear = new Date().getFullYear();
  const retireDateStr: string | undefined = model?.retireDate;
  const yearsAfterRetire: number = Number(model?.yearsAfterRetire) || 0;
  const planningHorizonYears = Number((model as any)?.planningHorizonYears) || undefined;
  const taxRate: number = normalizePct((model as any)?.taxPercentage);
  const inflRate: number = normalizePct((model as any)?.inflationPercentage);
  let retireYear: number | undefined;
  if (retireDateStr && /\d{2}\/\d{2}\/\d{4}/.test(retireDateStr)) retireYear = Number(retireDateStr.split('/')[2]);
  const beginYear = nowYear;
  let endYear = retireYear ? retireYear + yearsAfterRetire : nowYear + 10;
  if (planningHorizonYears && planningHorizonYears > 0) {
    endYear = beginYear + planningHorizonYears - 1;
  }
  let startYear: number | undefined;
  if (startDateStr && /\d{2}\/\d{2}\/\d{4}/.test(startDateStr)) startYear = Number(startDateStr.split('/')[2]);
  const grossValues: Record<number, number | null> = {};
  const afterTaxValues: Record<number, number | null> = {};
  const realAfterTaxValues: Record<number, number | null> = {};
  for (let y = beginYear; y <= endYear; y++) {
    if (startYear !== undefined && y >= startYear) {
      const gross = monthly ? Math.round(monthly) : 0;
      const afterTax = Math.round(gross * (1 - taxRate));
      const realAfterTax = Math.round(afterTax / Math.pow(1 + inflRate, y - beginYear));
      grossValues[y] = gross;
      afterTaxValues[y] = afterTax;
      realAfterTaxValues[y] = realAfterTax;
    } else {
      grossValues[y] = null;
      afterTaxValues[y] = null;
      realAfterTaxValues[y] = null; // so line starts at first payment year
    }
  }
  return {
    beginYear,
    endYear,
    valueLabel: 'Monthly Income',
    series: [
      { name: `${annuityName} Gross`, values: grossValues, strokeWidth: 3 },
      { name: `${annuityName} After Tax`, values: afterTaxValues, strokeDasharray: '5 4' },
      { name: `${annuityName} After Tax & Inflation`, values: realAfterTaxValues, strokeDasharray: '2 3' }
    ]
  };
}

/**
 * Build TOTAL investment balance + withdrawal chart (single multi-line chart)
 */
export function buildTotalInvestmentAggregates(model: any): {
  beginYear: number;
  endYear: number;
  balanceSeries: { name: string; values: Record<number, number | null>; strokeWidth?: number; strokeDasharray?: string }[];
  withdrawalSeries: { name: string; values: Record<number, number | null>; strokeWidth?: number; strokeDasharray?: string }[];
} {
  // Investments
  const invRoot: any = (model as any)?.investments;
  let investmentNames: string[] = [];
  if (invRoot) {
    if (invRoot.items && typeof invRoot.items === 'object') {
      investmentNames = Object.keys(invRoot.items).sort();
    } else if (!('items' in invRoot) && typeof invRoot === 'object') {
      investmentNames = Object.keys(invRoot).sort(); // legacy structure
    }
  }
  // Wages
  const wageRoot: any = (model as any)?.wages?.items;
  const wageNames: string[] = wageRoot ? Object.keys(wageRoot).sort() : [];
  // Annuities
  const annRoot: any = (model as any)?.annuities?.items;
  const annuityNames: string[] = annRoot ? Object.keys(annRoot).sort() : [];

  // If nothing at all, return empty stub
  if (!investmentNames.length && !annuityNames.length && !wageNames.length) {
    const nowYear = new Date().getFullYear();
    return { beginYear: nowYear, endYear: nowYear, balanceSeries: [], withdrawalSeries: [] };
  }

  const investmentSeries = investmentNames.map((n) => buildInvestmentBalanceAndWithdrawalChart(n, model));
  const annuitySeries = annuityNames.map((n) => buildAnnuityMonthlyIncomeChart(n, model));
  const wageSeries = wageNames.map((n) => buildWageMonthlyIncomeChart(n, model));
  // Map wage stop work years for suppression in aggregation to avoid overlap spike.
  const wageStopWorkYears: Record<string, number | undefined> = {};
  wageNames.forEach(n => {
    const swd: string | undefined = wageRoot?.[n]?.stopWorkDate;
    if (swd && /\d{2}\/\d{2}\/\d{4}/.test(swd)) {
      wageStopWorkYears[n] = Number(swd.split('/')[2]);
    }
  });

  // Determine combined horizon
  const horizonSources: any[] = [...investmentSeries, ...annuitySeries, ...wageSeries];
  const beginYear = horizonSources.reduce((min, p: any) => Math.min(min, p.beginYear), horizonSources[0].beginYear);
  const endYear = horizonSources.reduce((max, p: any) => Math.max(max, p.endYear), horizonSources[0].endYear);

  const taxRateAgg: number = normalizePct(model?.taxPercentage);
  const inflRateAgg: number = normalizePct(model?.inflationPercentage);

  // Aggregates
  const totalBalance: Record<number, number> = {};
  const totalBalanceAfterTax: Record<number, number> = {};
  const totalBalanceRealAfterTax: Record<number, number> = {};
  const totalIncomeGross: Record<number, number | null> = {};
  const totalIncomeAfterTax: Record<number, number | null> = {};
  const totalIncomeRealAfterTax: Record<number, number | null> = {};

  for (let y = beginYear; y <= endYear; y++) {
    // Balance only comes from investments
    let balSum = 0;
    investmentSeries.forEach(p => { const v = p.balance.values[y]; if (typeof v === 'number') balSum += v; });
    if (investmentSeries.length) {
      totalBalance[y] = balSum;
      const afterTaxBal = balSum * (1 - taxRateAgg);
      totalBalanceAfterTax[y] = Math.round(afterTaxBal);
      totalBalanceRealAfterTax[y] = Math.round(afterTaxBal / Math.pow(1 + inflRateAgg, y - beginYear));
    } else {
      // If no investments, leave balance series empty (not adding nulls avoids stray legend entries)
    }

    let anyIncome = false;
    let gSum = 0; let atSum = 0; let ratSum = 0;

    // Investment withdrawals (monthly) act as income
    investmentSeries.forEach(p => {
      const grossSeries = p.withdrawalSeries[0]?.values;
      const afterTaxSeries = p.withdrawalSeries[1]?.values;
      const realAfterTaxSeries = p.withdrawalSeries[2]?.values;
      const g = grossSeries ? grossSeries[y] : null;
      const at = afterTaxSeries ? afterTaxSeries[y] : null;
      const rat = realAfterTaxSeries ? realAfterTaxSeries[y] : null;
      if (typeof g === 'number') { anyIncome = true; gSum += g; }
      if (typeof at === 'number') atSum += at;
      if (typeof rat === 'number') ratSum += rat;
    });

    // Annuity monthly income
    annuitySeries.forEach(a => {
      const grossSeries = a.series[0]?.values;
      const atSeries = a.series[1]?.values;
      const ratSeries = a.series[2]?.values;
      const g = grossSeries ? grossSeries[y] : null;
      const at = atSeries ? atSeries[y] : null;
      const rat = ratSeries ? ratSeries[y] : null;
      if (typeof g === 'number') { anyIncome = true; gSum += g; }
      if (typeof at === 'number') atSum += at;
      if (typeof rat === 'number') ratSum += rat;
    });

    // Wage monthly income (NEW: include wages in total income aggregation)
    wageSeries.forEach((w, idx) => {
      const wageName = wageNames[idx];
      const stopYear = wageStopWorkYears[wageName];
      // Suppress the LAST year of wages in total aggregation to prevent spike / double-dip when withdrawals begin same year.
      if (stopYear !== undefined && y === stopYear) return; // skip adding wages for this terminal year
      const grossSeries = w.series[0]?.values;
      const atSeries = w.series[1]?.values;
      const ratSeries = w.series[2]?.values;
      const g = grossSeries ? (grossSeries as any)[y] : null;
      const at = atSeries ? (atSeries as any)[y] : null;
      const rat = ratSeries ? (ratSeries as any)[y] : null;
      if (typeof g === 'number') { anyIncome = true; gSum += g; }
      if (typeof at === 'number') atSum += at;
      if (typeof rat === 'number') ratSum += rat;
    });

    totalIncomeGross[y] = anyIncome ? Math.round(gSum) : null;
    totalIncomeAfterTax[y] = anyIncome ? Math.round(atSum) : null;
    totalIncomeRealAfterTax[y] = anyIncome ? Math.round(ratSum) : null;
  }

  const balanceSeries = investmentSeries.length ? [
    { name: 'Total Investment Balance', values: totalBalance, strokeWidth: 3 },
    { name: 'Total Investment Balance After Tax', values: totalBalanceAfterTax, strokeDasharray: '5 4' },
    { name: 'Total Investment Balance After Tax & Inflation', values: totalBalanceRealAfterTax, strokeDasharray: '2 3' }
  ] : [];

  return {
    beginYear,
    endYear,
    balanceSeries,
    withdrawalSeries: [
      { name: 'Total Monthly Income', values: totalIncomeGross, strokeDasharray: '4 4' },
      { name: 'Total Monthly Income After Tax', values: totalIncomeAfterTax, strokeDasharray: '5 3' },
      { name: 'Total Monthly Income After Tax & Inflation', values: totalIncomeRealAfterTax, strokeDasharray: '2 3' },
    ]
  };
}
