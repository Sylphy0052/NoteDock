import { InputHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`

    return (
      <div className={clsx('text-input-wrapper', className)}>
        {label && (
          <label htmlFor={inputId} className="text-input-label">
            {label}
          </label>
        )}
        <div className={clsx('text-input-container', error && 'has-error')}>
          {leftIcon && <span className="text-input-icon-left">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'text-input',
              leftIcon && 'has-left-icon',
              rightIcon && 'has-right-icon'
            )}
            {...props}
          />
          {rightIcon && <span className="text-input-icon-right">{rightIcon}</span>}
        </div>
        {error && <span className="text-input-error">{error}</span>}
        {helperText && !error && <span className="text-input-helper">{helperText}</span>}
      </div>
    )
  }
)

TextInput.displayName = 'TextInput'

export default TextInput
