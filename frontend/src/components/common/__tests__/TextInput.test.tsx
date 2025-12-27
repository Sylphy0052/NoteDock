import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../../../test/utils'
import TextInput from '../TextInput'

describe('TextInput', () => {
  it('renders with default props', () => {
    render(<TextInput placeholder="Enter text" />)

    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
  })

  it('renders with label', () => {
    render(<TextInput label="Username" />)

    expect(screen.getByText('Username')).toBeInTheDocument()
  })

  it('handles value changes', () => {
    const handleChange = vi.fn()
    render(<TextInput onChange={handleChange} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })

    expect(handleChange).toHaveBeenCalled()
  })

  it('displays error message', () => {
    render(<TextInput error="This field is required" />)

    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<TextInput disabled placeholder="Disabled" />)

    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled()
  })

  it('applies custom className to wrapper', () => {
    const { container } = render(<TextInput className="custom-input" />)

    expect(container.querySelector('.text-input-wrapper')).toHaveClass('custom-input')
  })

  it('displays helper text when no error', () => {
    render(<TextInput helperText="Please enter your username" />)

    expect(screen.getByText('Please enter your username')).toBeInTheDocument()
  })

  it('shows error instead of helper text when error exists', () => {
    render(<TextInput error="Error message" helperText="Helper text" />)

    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument()
  })

  it('renders left icon', () => {
    const { container } = render(<TextInput leftIcon={<span data-testid="left-icon">L</span>} />)

    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    expect(container.querySelector('.text-input-icon-left')).toBeInTheDocument()
  })

  it('renders right icon', () => {
    const { container } = render(<TextInput rightIcon={<span data-testid="right-icon">R</span>} />)

    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    expect(container.querySelector('.text-input-icon-right')).toBeInTheDocument()
  })
})
