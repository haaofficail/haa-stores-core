'use client'

interface StepIndicatorProps {
  steps: string[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-5)' }}>
      {steps.map((step, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              fontSize: '12px',
              fontWeight: 700,
              flexShrink: 0,
              background:
                idx < currentStep ? 'var(--color-success)' :
                idx === currentStep ? 'var(--color-primary-500)' :
                'var(--surface-2)',
              color:
                idx <= currentStep ? 'var(--text-on-color, #fff)' : 'var(--text-tertiary)',
            }}
          >
            {idx < currentStep ? '✓' : idx + 1}
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: idx <= currentStep ? 600 : 400,
              color: idx <= currentStep ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            {step}
          </span>
          {idx < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: idx < currentStep ? 'var(--color-success)' : 'var(--surface-2)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
