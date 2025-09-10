// Centralized chart builder utility functions extracted from _index.tsx
// Each function returns the data shape expected by the FinancialChart component.

export function buildWageMonthlyIncomeChart(wageName: string, model: any): {
  beginYear: number;
  endYear: number;
  valueLabel: string;
  series: { name: string; values: Record<number, number>; strokeWidth?: number; strokeDasharray?: string }[];
} {
  const wageData: any = (model as any)?.wages?.items?.[wageName] || {};
  const annual: number = Number(wageData?.annual) || 0;
  const raise: number = Number(wageData?.raise) || 0; // decimal form (0.02 = 2%)
  const taxRate: number = Number((model as any)?.taxPercentage) || 0;
  const inflRate: number = Number((model as any)?.inflationPercentage) || 0;
  const stopWorkDateStr: string | undefined = wageData?.stopWorkDate;
  const beginYear = new Date().getFullYear();
  let endYear = beginYear;
  if (stopWorkDateStr && /\d{2}\/\d{2}\/\d{4}/.test(stopWorkDateStr)) {
    endYear = Number(stopWorkDateStr.split('/')[2]) || beginYear;
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
  const rate: number = Number(investment?.rate) || 0; // decimal form
  const withdrawalDateStr: string | undefined = investment?.withdrawalDate; // MM/DD/YYYY
  const withdrawalRate: number = Number(investment?.withdrawalRate) || 0; // decimal form
  const taxRate: number = Number((model as any)?.taxPercentage) || 0;
  const inflRate: number = Number((model as any)?.inflationPercentage) || 0;
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
  const withdrawalAfterTaxValues: Record<number, number | null> = {};
  const withdrawalRealAfterTaxValues: Record<number, number | null> = {};

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
  const taxRate: number = Number((model as any)?.taxPercentage) || 0;
  const inflRate: number = Number((model as any)?.inflationPercentage) || 0;
  let retireYear: number | undefined;
  if (retireDateStr && /\d{2}\/\d{2}\/\d{4}/.test(retireDateStr)) retireYear = Number(retireDateStr.split('/')[2]);
  const endYear = retireYear ? retireYear + yearsAfterRetire : nowYear + 10;
  const beginYear = nowYear;
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
  const invRoot: any = (model as any)?.investments;
  let investmentNames: string[] = [];
  if (invRoot) {
    if (invRoot.items && typeof invRoot.items === 'object') {
      investmentNames = Object.keys(invRoot.items).sort();
    } else if (!('items' in invRoot) && typeof invRoot === 'object') {
      // legacy
      investmentNames = Object.keys(invRoot).sort();
    }
  }
  const taxRate: number = Number(model?.taxPercentage) || 0;
  const inflRate: number = Number(model?.inflationPercentage) || 0;
  if (!investmentNames.length) {
    const nowYear = new Date().getFullYear();
    return { beginYear: nowYear, endYear: nowYear, balanceSeries: [], withdrawalSeries: [] };
  }
  const per = investmentNames.map((n) => buildInvestmentBalanceAndWithdrawalChart(n, model));
  const beginYear = per.reduce((min, p) => Math.min(min, p.beginYear), per[0].beginYear);
  const endYear = per.reduce((max, p) => Math.max(max, p.endYear), per[0].endYear);

  const totalBalance: Record<number, number> = {};
  const totalBalanceAfterTax: Record<number, number> = {};
  const totalBalanceRealAfterTax: Record<number, number> = {};
  const totalWithdrawalGross: Record<number, number | null> = {};
  const totalWithdrawalAfterTax: Record<number, number | null> = {};
  const totalWithdrawalRealAfterTax: Record<number, number | null> = {};

  for (let y = beginYear; y <= endYear; y++) {
    let balSum = 0;
    per.forEach(p => { const v = p.balance.values[y]; if (typeof v === 'number') balSum += v; });
    totalBalance[y] = balSum;
    const afterTaxBal = balSum * (1 - taxRate);
    totalBalanceAfterTax[y] = Math.round(afterTaxBal);
    totalBalanceRealAfterTax[y] = Math.round(afterTaxBal / Math.pow(1 + inflRate, y - beginYear));

    let anyWithdrawal = false;
    let wGross = 0; let wAfterTax = 0; let wRealAfterTax = 0;
    per.forEach(p => {
      const grossSeries = p.withdrawalSeries[0]?.values;
      const afterTaxSeries = p.withdrawalSeries[1]?.values;
      const realAfterTaxSeries = p.withdrawalSeries[2]?.values;
      const g = grossSeries ? grossSeries[y] : null;
      const at = afterTaxSeries ? afterTaxSeries[y] : null;
      const rat = realAfterTaxSeries ? realAfterTaxSeries[y] : null;
      if (typeof g === 'number') { anyWithdrawal = true; wGross += g; }
      if (typeof at === 'number') wAfterTax += at;
      if (typeof rat === 'number') wRealAfterTax += rat;
    });
    totalWithdrawalGross[y] = anyWithdrawal ? Math.round(wGross) : null;
    totalWithdrawalAfterTax[y] = anyWithdrawal ? Math.round(wAfterTax) : null;
    totalWithdrawalRealAfterTax[y] = anyWithdrawal ? Math.round(wRealAfterTax) : null;
  }

  return {
    beginYear,
    endYear,
    balanceSeries: [
      { name: 'Total Investment Balance', values: totalBalance, strokeWidth: 3 },
      { name: 'Total Investment Balance After Tax', values: totalBalanceAfterTax, strokeDasharray: '5 4' },
      { name: 'Total Investment Balance After Tax & Inflation', values: totalBalanceRealAfterTax, strokeDasharray: '2 3' },
    ],
    withdrawalSeries: [
      { name: 'Total Monthly Withdrawal', values: totalWithdrawalGross, strokeDasharray: '4 4' },
      { name: 'Total Monthly Withdrawal After Tax', values: totalWithdrawalAfterTax, strokeDasharray: '5 3' },
      { name: 'Total Monthly Withdrawal After Tax & Inflation', values: totalWithdrawalRealAfterTax, strokeDasharray: '2 3' },
    ]
  };
}
