import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../../test/utils'
import { ProjectLinkHoverCard, parseProjectLinks } from '../ProjectLinkHoverCard'

// Mock the API
vi.mock('../../../api/projects', () => ({
  getProjectSummary: vi.fn(() =>
    Promise.resolve({
      id: 1,
      name: 'Test Project',
      company_name: 'Test Company',
    })
  ),
}))

describe('parseProjectLinks', () => {
  it('returns text as-is when no project links', () => {
    const result = parseProjectLinks('Hello World')

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('Hello World')
  })

  it('parses single project link', () => {
    const result = parseProjectLinks('Check @P123 for details')

    expect(result).toHaveLength(3)
    expect(result[0]).toBe('Check ')
    // result[1] is the ReactElement with the link
    expect(result[2]).toBe(' for details')
  })

  it('parses multiple project links', () => {
    const result = parseProjectLinks('See @P1 and @P2 and @P3')

    expect(result).toHaveLength(6)
    expect(result[0]).toBe('See ')
    expect(result[2]).toBe(' and ')
    expect(result[4]).toBe(' and ')
  })

  it('parses project link at start of string', () => {
    const result = parseProjectLinks('@P42 is the project')

    expect(result).toHaveLength(2)
    // First element is the link
    expect(result[1]).toBe(' is the project')
  })

  it('parses project link at end of string', () => {
    const result = parseProjectLinks('The project is @P42')

    expect(result).toHaveLength(2)
    expect(result[0]).toBe('The project is ')
    // Second element is the link
  })

  it('handles empty string', () => {
    const result = parseProjectLinks('')

    expect(result).toHaveLength(0)
  })

  it('does not parse invalid project link formats', () => {
    const result = parseProjectLinks('This @P is not valid')

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('This @P is not valid')
  })
})

describe('ProjectLinkHoverCard', () => {
  it('renders children', () => {
    render(
      <ProjectLinkHoverCard projectId={1}>
        <span>@P1</span>
      </ProjectLinkHoverCard>
    )

    expect(screen.getByText('@P1')).toBeInTheDocument()
  })

  it('shows hover card on mouse enter after delay', async () => {
    render(
      <ProjectLinkHoverCard projectId={1}>
        <span>@P1</span>
      </ProjectLinkHoverCard>
    )

    const trigger = screen.getByText('@P1').closest('.project-link-trigger')
    if (trigger) {
      fireEvent.mouseEnter(trigger)
    }

    // Wait for the 300ms delay plus some buffer
    await waitFor(
      () => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )
  })

  it('hides hover card on mouse leave', async () => {
    render(
      <ProjectLinkHoverCard projectId={1}>
        <span>@P1</span>
      </ProjectLinkHoverCard>
    )

    const trigger = screen.getByText('@P1').closest('.project-link-trigger')
    if (trigger) {
      fireEvent.mouseEnter(trigger)

      await waitFor(
        () => {
          expect(screen.getByText('Test Project')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )

      fireEvent.mouseLeave(trigger)

      await waitFor(() => {
        expect(screen.queryByText('Test Project')).not.toBeInTheDocument()
      })
    }
  })
})
