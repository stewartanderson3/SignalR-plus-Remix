// Centralized chart builder utility functions extracted from _index.tsx
// Each function returns the data shape expected by the FinancialChart component.

/** Date regex for very lightweight validation (MM/DD/YYYY). */
const DATE_YEAR_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Defensive helper: user/model percent values should already be fractional (0.0925 for 9.25%).
 * If a legacy or corrupted model stores 9.25 instead, we auto-normalize.
 */
function normalizePct(val: unknown): number {
  const n = Number(val);
  if (!isFinite(n) || n === 0) return 0;
  // Treat any magnitude > 1 (or < -1) as a whole-percent input.
  return (n > 1 || n < -1) ? n / 100 : n;
}

/** Extract year integer from a date string (MM/DD/YYYY) or return undefined. */
function extractYear(dateStr: unknown): number | undefined {
  if (typeof dateStr !== 'string') return undefined;
  const m = DATE_YEAR_REGEX.exec(dateStr);
  return m ? Number(m[3]) : undefined;
}

/** Inflation adjust an after-tax nominal value back to base year purchasing power. */
function adjustForInflation(afterTaxValue: number, year: number, beginYear: number, inflRate: number): number {
  if (!inflRate) return afterTaxValue; // fast path
  const yearsOffset = year - beginYear;
  return afterTaxValue / Math.pow(1 + inflRate, yearsOffset);
}

/** Small utility to round (Math.round) consistently. */
const R = Math.round;

/** Inclusive year range utility. */
const rangeYears = (begin: number, end: number): number[] =>
  Array.from({ length: end - begin + 1 }, (_, i) => begin + i);

export function buildWageMonthlyIncomeChart(wageName: string, model: any): {
  beginYear: number;
  endYear: number;
  valueLabel: string;
  series: { name: string; values: Record<number, number>; strokeWidth?: number; strokeDasharray?: string }[];
} {
  const wageData: any = model?.wages?.items?.[wageName] || {};
  const annual: number = Number(wageData.annual) || 0;
  const raise: number = normalizePct(wageData.raise); // fractional
  const taxRate: number = normalizePct(model?.taxPercentage);
  const inflRate: number = normalizePct(model?.inflationPercentage);
  const beginYear = new Date().getFullYear();
  const planningHorizonYears = Number(model?.planningHorizonYears) || undefined;
  // Horizon preference: planning horizon overrides stop work.
  const stopWorkYear = extractYear(wageData.stopWorkDate);
  let endYear = planningHorizonYears && planningHorizonYears > 0
    ? beginYear + planningHorizonYears - 1
    : (stopWorkYear ?? beginYear);
  if (endYear < beginYear) endYear = beginYear; // guard

  const years = rangeYears(beginYear, endYear);
  const raiseMultiplier = 1 + raise; // growth per year
  const wageYearTuples = years.map((y, idx) => {
    const annualForYear = annual * Math.pow(raiseMultiplier, idx);
    const monthlyIncome = annualForYear / 12;
    const gross = R(monthlyIncome);
    const afterTax = R(monthlyIncome * (1 - taxRate));
    const realAfterTax = R(adjustForInflation(afterTax, y, beginYear, inflRate));
    return [y, gross, afterTax, realAfterTax] as const;
  });
  const grossValues = Object.fromEntries(wageYearTuples.map(t => [t[0], t[1]])) as Record<number, number>;
  const afterTaxValues = Object.fromEntries(wageYearTuples.map(t => [t[0], t[2]])) as Record<number, number>;
  const realAfterTaxValues = Object.fromEntries(wageYearTuples.map(t => [t[0], t[3]])) as Record<number, number>;
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
  const investmentRoot: any = model?.investments;
  const investment: any = investmentRoot?.items?.[investmentName]
    || (investmentRoot && !('items' in investmentRoot) ? investmentRoot?.[investmentName] : {})
    || {};

  const initialBalance: number = Number(investment.balance) || 0;
  const rate: number = normalizePct(investment.rate);
  const withdrawalRate: number = normalizePct(investment.withdrawalRate);
  const contributionsFromWage: string | undefined = investment.contributionsFrom;
  const contributionRate: number = normalizePct(investment.contributionRate);
  const taxRate: number = normalizePct(model?.taxPercentage);
  const inflRate: number = normalizePct(model?.inflationPercentage);
  const yearsAfterRetire: number = Number(model?.yearsAfterRetire) || 0;
  const planningHorizonYears = Number(model?.planningHorizonYears) || undefined;

  const nowYear = new Date().getFullYear();
  const beginYear = nowYear;
  const retireYear = extractYear(model?.retireDate);
  const withdrawalYear = extractYear(investment.withdrawalDate);

  let endYear = retireYear ? retireYear + yearsAfterRetire : nowYear + 10;
  if (planningHorizonYears && planningHorizonYears > 0) {
    endYear = beginYear + planningHorizonYears - 1;
  }

  // Wage reference (if any) for contributions.
  let wageAnnualBase = 0;
  let wageRaise = 0;
  let wageStopWorkYear: number | undefined;
  if (contributionsFromWage) {
    const wageData: any = model?.wages?.items?.[contributionsFromWage];
    if (wageData) {
      wageAnnualBase = Number(wageData.annual) || 0;
      wageRaise = normalizePct(wageData.raise);
      wageStopWorkYear = extractYear(wageData.stopWorkDate);
    }
  }

  // Flags and caches
  const enableLegacyBalancePctFallback = false;
  const continuousGrowthMultiplier = Math.exp(rate) - 1; // (e^r - 1)
  const wageRaiseMultiplier = 1 + wageRaise;
  let wageAnnualForYear = wageAnnualBase; // incremental growth

  const years = rangeYears(beginYear, endYear);
  const results = years.reduce((acc, y, idx) => {
    const balanceStartOfYear = idx === 0 ? initialBalance : acc.prevBalanceEnd;
    const withinWageYears = (wageStopWorkYear === undefined) || y <= wageStopWorkYear;
    const wageAnnualForYearStatic = wageAnnualBase > 0
      ? wageAnnualBase * Math.pow(wageRaiseMultiplier, idx)
      : 0;
    const contributionAnnual = contributionRate > 0
      ? contributionsFromWage && wageAnnualBase > 0
        ? (withinWageYears ? wageAnnualForYearStatic * contributionRate : 0)
        : (enableLegacyBalancePctFallback ? balanceStartOfYear * contributionRate : 0)
      : 0;
    const balanceAfterContribution = balanceStartOfYear + contributionAnnual;
    const balanceAfterGrowth = balanceAfterContribution + balanceAfterContribution * continuousGrowthMultiplier;
    const shouldWithdraw = withdrawalYear !== undefined && y >= withdrawalYear && withdrawalRate > 0;
    const withdrawalAnnualRaw = shouldWithdraw ? balanceStartOfYear * withdrawalRate : 0;
    const withdrawalAnnual = shouldWithdraw && withdrawalAnnualRaw > balanceAfterGrowth
      ? balanceAfterGrowth
      : withdrawalAnnualRaw;
    const postWithdrawalBalance = balanceAfterGrowth - withdrawalAnnual;
    const grossMonthly = withdrawalAnnual / 12;
    const afterTax = grossMonthly * (1 - taxRate);
    const realAfterTax = adjustForInflation(afterTax, y, beginYear, inflRate);
    const grossMonthlyVal = shouldWithdraw ? R(grossMonthly) : null;
    const afterTaxVal = shouldWithdraw ? R(afterTax) : null;
    const realAfterTaxVal = shouldWithdraw ? R(realAfterTax) : null;
    acc.balance[y] = R(postWithdrawalBalance);
    acc.wGross[y] = grossMonthlyVal;
    acc.wAfterTax[y] = afterTaxVal;
    acc.wRealAfterTax[y] = realAfterTaxVal;
    acc.prevBalanceEnd = postWithdrawalBalance;
    return acc;
  }, {
    balance: {} as Record<number, number>,
    wGross: {} as Record<number, number | null>,
    wAfterTax: {} as Record<number, number | null>,
    wRealAfterTax: {} as Record<number, number | null>,
    prevBalanceEnd: initialBalance,
  });

  const balanceValues = results.balance;
  const withdrawalMonthlyValues = results.wGross;
  const withdrawalAfterTaxValues = results.wAfterTax;
  const withdrawalRealAfterTaxValues = results.wRealAfterTax;

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
  const annuity: any = model?.annuities?.items?.[annuityName] || {};
  const monthly: number = Number(annuity.monthly) || 0;
  const taxRate: number = normalizePct(model?.taxPercentage);
  const inflRate: number = normalizePct(model?.inflationPercentage);
  const yearsAfterRetire: number = Number(model?.yearsAfterRetire) || 0;
  const planningHorizonYears = Number(model?.planningHorizonYears) || undefined;

  const nowYear = new Date().getFullYear();
  const beginYear = nowYear;
  const retireYear = extractYear(model?.retireDate);
  const startYear = extractYear(annuity.startDate);
  let endYear = retireYear ? retireYear + yearsAfterRetire : nowYear + 10;
  if (planningHorizonYears && planningHorizonYears > 0) {
    endYear = beginYear + planningHorizonYears - 1;
  }

  const years = rangeYears(beginYear, endYear);
  const annuityYearTuples = years.map(y => {
    const active = startYear !== undefined && y >= startYear;
    const gross = active ? (monthly ? R(monthly) : 0) : null;
    const afterTax = gross !== null ? R(gross * (1 - taxRate)) : null;
    const realAfterTax = gross !== null && afterTax !== null
      ? R(adjustForInflation(afterTax, y, beginYear, inflRate))
      : null;
    return [y, gross, afterTax, realAfterTax] as const;
  });
  const grossValues = Object.fromEntries(annuityYearTuples.map(t => [t[0], t[1]])) as Record<number, number | null>;
  const afterTaxValues = Object.fromEntries(annuityYearTuples.map(t => [t[0], t[2]])) as Record<number, number | null>;
  const realAfterTaxValues = Object.fromEntries(annuityYearTuples.map(t => [t[0], t[3]])) as Record<number, number | null>;
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
  // Investments (normal + legacy structure handling)
  const invRoot: any = model?.investments;
  let investmentNames: string[] = [];
  if (invRoot) {
    if (invRoot.items && typeof invRoot.items === 'object') investmentNames = Object.keys(invRoot.items).sort();
    else if (!('items' in invRoot) && typeof invRoot === 'object') investmentNames = Object.keys(invRoot).sort();
  }

  const wageRoot: any = model?.wages?.items;
  const wageNames: string[] = wageRoot ? Object.keys(wageRoot).sort() : [];
  const annRoot: any = model?.annuities?.items;
  const annuityNames: string[] = annRoot ? Object.keys(annRoot).sort() : [];

  // Nothing => empty stub
  if (!investmentNames.length && !annuityNames.length && !wageNames.length) {
    const nowYear = new Date().getFullYear();
    return { beginYear: nowYear, endYear: nowYear, balanceSeries: [], withdrawalSeries: [] };
  }

  const investmentSeries = investmentNames.map(n => buildInvestmentBalanceAndWithdrawalChart(n, model));
  const annuitySeries = annuityNames.map(n => buildAnnuityMonthlyIncomeChart(n, model));
  const wageSeries = wageNames.map(n => buildWageMonthlyIncomeChart(n, model));

  // Pre-compute wage stop-work years for spike suppression.
  const wageStopWorkYears: Record<string, number | undefined> = {};
  wageNames.forEach(n => { wageStopWorkYears[n] = extractYear(wageRoot?.[n]?.stopWorkDate); });

  // Determine combined horizon.
  const horizonSources: any[] = [...investmentSeries, ...annuitySeries, ...wageSeries];
  const beginYear = horizonSources.reduce((min, p: any) => p.beginYear < min ? p.beginYear : min, horizonSources[0].beginYear);
  const endYear = horizonSources.reduce((max, p: any) => p.endYear > max ? p.endYear : max, horizonSources[0].endYear);

  const taxRateAgg: number = normalizePct(model?.taxPercentage);
  const inflRateAgg: number = normalizePct(model?.inflationPercentage);

  // Aggregates
  const years = rangeYears(beginYear, endYear);
  const aggregates = years.map(y => {
    // Balance sums
    const balSum = investmentSeries.reduce((sum, p) => {
      const v = p.balance.values[y];
      return typeof v === 'number' ? sum + v : sum;
    }, 0);
    const afterTaxBal = balSum * (1 - taxRateAgg);
    const realAfterTaxBal = adjustForInflation(afterTaxBal, y, beginYear, inflRateAgg);

    // Income components helper
    const collect = (g?: number | null, at?: number | null, rat?: number | null) => ({ g, at, rat });
    const incomeParts = [
      ...investmentSeries.map(p => collect(
        p.withdrawalSeries[0]?.values[y],
        p.withdrawalSeries[1]?.values[y],
        p.withdrawalSeries[2]?.values[y]
      )),
      ...annuitySeries.map(a => collect(
        a.series[0]?.values[y],
        a.series[1]?.values[y],
        a.series[2]?.values[y]
      )),
      ...wageSeries.map((w, i) => {
        const stopYear = wageStopWorkYears[wageNames[i]];
        return (stopYear !== undefined && y === stopYear)
          ? collect(null, null, null)
          : collect(w.series[0]?.values[y], w.series[1]?.values[y], w.series[2]?.values[y]);
      })
    ];

    const { gSum, atSum, ratSum, anyIncome } = incomeParts.reduce((acc, part) => {
      if (typeof part.g === 'number') { acc.gSum += part.g; acc.anyIncome = true; }
      if (typeof part.at === 'number') acc.atSum += part.at;
      if (typeof part.rat === 'number') acc.ratSum += part.rat;
      return acc;
    }, { gSum: 0, atSum: 0, ratSum: 0, anyIncome: false });

    return {
      y,
      bal: balSum,
      balAT: afterTaxBal,
      balRealAT: realAfterTaxBal,
      g: anyIncome ? gSum : null,
      at: anyIncome ? atSum : null,
      rat: anyIncome ? ratSum : null,
    };
  });

  const totalBalance = investmentSeries.length
    ? Object.fromEntries(aggregates.map(a => [a.y, a.bal])) as Record<number, number>
    : {};
  const totalBalanceAfterTax = investmentSeries.length
    ? Object.fromEntries(aggregates.map(a => [a.y, R(a.balAT)])) as Record<number, number>
    : {};
  const totalBalanceRealAfterTax = investmentSeries.length
    ? Object.fromEntries(aggregates.map(a => [a.y, R(a.balRealAT)])) as Record<number, number>
    : {};

  const totalIncomeGross = Object.fromEntries(aggregates.map(a => [a.y, a.g])) as Record<number, number | null>;
  const totalIncomeAfterTax = Object.fromEntries(aggregates.map(a => [a.y, a.at])) as Record<number, number | null>;
  const totalIncomeRealAfterTax = Object.fromEntries(aggregates.map(a => [a.y, a.rat])) as Record<number, number | null>;

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
