import React, { useState } from 'react';
import { Leaf, useValidationModel } from 'leaf-validator';

// Simple numeric validators
const isRequired = (value: number | string) => (value === undefined || value === null || value === '' ? ['Required'] : undefined);
const isPositiveNumber = (value: any) => {
  if (value === undefined || value === null || value === '') return undefined; // required handled separately
  const num = Number(value);
  return isNaN(num) || num < 0 ? ['Must be a positive number'] : undefined;
};

// Model shape we'll build up on changes
// { investment: { initialAmount: number, meanAnnualReturn: number } }
export default function Roth401kForm() {
  const [model, setModel] = useState<any>({});
  const validationModel = useValidationModel();
  const [forceShowErrors, setForceShowErrors] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForceShowErrors(true);

    const allErrors = validationModel.getAllErrorsForLocation('investment') || [];
    if (allErrors.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('Validation errors present, calculation aborted.', allErrors);
      return;
    }
    // eslint-disable-next-line no-console
    console.log('Calculate with model:', model);
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.6", padding: 24 }}>
      <section style={{ marginTop: 24, maxWidth: 560 }}>
        <h2 style={{ margin: '0 0 16px' }}>Roth/401k Investment</h2>
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          {/* Initial Investment Amount */}
          <Leaf
            model={model}
            onChange={setModel}
            validationModel={validationModel}
            location="investment.initialAmount"
            validators={[isRequired, isPositiveNumber]}
            showErrors={forceShowErrors}
          >
            {(value: any, setValue: (v: any) => void, showErrors: () => void, errors: string[]) => (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 4 }} htmlFor="initialAmount">Initial Investment Amount</label>
                <input
                  id="initialAmount"
                  type="number"
                  inputMode="decimal"
                  value={value ?? ''}
                  onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
                  onBlur={showErrors}
                  placeholder="e.g. 10000"
                  style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}
                />
                {errors?.length > 0 && (
                  <ul style={{ color: '#b91c1c', margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Leaf>

          {/* Mean annual rate of return */}
          <Leaf
            model={model}
            onChange={setModel}
            validationModel={validationModel}
            location="investment.meanAnnualReturn"
            validators={[isRequired, isPositiveNumber]}
            showErrors={forceShowErrors}
          >
            {(value: any, setValue: (v: any) => void, showErrors: () => void, errors: string[]) => (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 4 }} htmlFor="meanAnnualReturn">Mean annual rate of return (%)</label>
                <input
                  id="meanAnnualReturn"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={value ?? ''}
                  onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
                  onBlur={showErrors}
                  placeholder="e.g. 7"
                  style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}
                />
                {errors?.length > 0 && (
                  <ul style={{ color: '#b91c1c', margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Leaf>

          <div>
            <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Calculate</button>
          </div>
          <pre style={{ background: '#f9fafb', padding: 12, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, maxHeight: 160, overflow: 'auto' }}>{JSON.stringify(model, null, 2)}</pre>
        </form>
      </section>
    </main >
  );
}
