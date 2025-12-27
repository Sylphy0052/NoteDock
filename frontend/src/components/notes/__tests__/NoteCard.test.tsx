import { describe, it, expect } from 'vitest'
import { render, screen } from '../../../test/utils'
import NoteCard from '../NoteCard'
import type { NoteSummary } from '../../../api/types'

const createMockNote = (overrides?: Partial<NoteSummary>): NoteSummary => ({
  id: 1,
  title: 'Test Note',
  folder_id: null,
  project_id: null,
  project_name: null,
  is_pinned: false,
  is_readonly: false,
  is_hidden_from_home: false,
  updated_at: '2024-01-02T15:30:00Z',
  tags: [],
  cover_file_url: null,
  created_by: null,
  view_count: 0,
  ...overrides,
})

describe('NoteCard', () => {
  it('renders note title', () => {
    const note = createMockNote({ title: 'My Test Note' })
    render(<NoteCard note={note} />)

    expect(screen.getByText('My Test Note')).toBeInTheDocument()
  })

  it('links to note detail page', () => {
    const note = createMockNote({ id: 42 })
    render(<NoteCard note={note} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/notes/42')
  })

  it('displays formatted date', () => {
    const note = createMockNote({ updated_at: '2024-01-15T14:30:00Z' })
    render(<NoteCard note={note} />)

    // Date format depends on locale but should be present
    expect(screen.getByText(/2024/)).toBeInTheDocument()
  })

  it('shows pin badge when note is pinned', () => {
    const note = createMockNote({ is_pinned: true })
    render(<NoteCard note={note} />)

    expect(screen.getByTitle('ピン留め')).toBeInTheDocument()
  })

  it('does not show pin badge when note is not pinned', () => {
    const note = createMockNote({ is_pinned: false })
    render(<NoteCard note={note} />)

    expect(screen.queryByTitle('ピン留め')).not.toBeInTheDocument()
  })

  it('shows readonly badge when note is readonly', () => {
    const note = createMockNote({ is_readonly: true })
    render(<NoteCard note={note} />)

    expect(screen.getByTitle('閲覧専用')).toBeInTheDocument()
  })

  it('does not show readonly badge when note is not readonly', () => {
    const note = createMockNote({ is_readonly: false })
    render(<NoteCard note={note} />)

    expect(screen.queryByTitle('閲覧専用')).not.toBeInTheDocument()
  })

  it('displays tags', () => {
    const note = createMockNote({
      tags: [
        { id: 1, name: 'react' },
        { id: 2, name: 'typescript' },
      ],
    })
    render(<NoteCard note={note} />)

    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('typescript')).toBeInTheDocument()
  })

  it('shows only first 3 tags and a count for remaining', () => {
    const note = createMockNote({
      tags: [
        { id: 1, name: 'tag1' },
        { id: 2, name: 'tag2' },
        { id: 3, name: 'tag3' },
        { id: 4, name: 'tag4' },
        { id: 5, name: 'tag5' },
      ],
    })
    render(<NoteCard note={note} />)

    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
    expect(screen.getByText('tag3')).toBeInTheDocument()
    expect(screen.queryByText('tag4')).not.toBeInTheDocument()
    expect(screen.queryByText('tag5')).not.toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('does not show tags section when no tags', () => {
    const note = createMockNote({ tags: [] })
    const { container } = render(<NoteCard note={note} />)

    expect(container.querySelector('.note-card-tags')).not.toBeInTheDocument()
  })

  it('displays cover image when available', () => {
    const note = createMockNote({
      cover_file_url: 'https://example.com/image.jpg',
    })
    render(<NoteCard note={note} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('does not show cover image when not available', () => {
    const note = createMockNote({ cover_file_url: null })
    const { container } = render(<NoteCard note={note} />)

    expect(container.querySelector('.note-card-cover')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const note = createMockNote()
    render(<NoteCard note={note} className="custom-card" />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('custom-card')
  })

  it('displays author name when created_by is set', () => {
    const note = createMockNote({ created_by: 'John Doe' })
    render(<NoteCard note={note} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('does not show author section when created_by is null', () => {
    const note = createMockNote({ created_by: null })
    const { container } = render(<NoteCard note={note} />)

    expect(container.querySelector('.note-card-author')).not.toBeInTheDocument()
  })

  it('displays view count', () => {
    const note = createMockNote({ view_count: 42 })
    render(<NoteCard note={note} />)

    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('displays zero view count', () => {
    const note = createMockNote({ view_count: 0 })
    render(<NoteCard note={note} />)

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('displays project name when project_name is set', () => {
    const note = createMockNote({ project_id: 1, project_name: 'My Project' })
    render(<NoteCard note={note} />)

    expect(screen.getByText('My Project')).toBeInTheDocument()
  })

  it('does not show project section when project_name is null', () => {
    const note = createMockNote({ project_id: null, project_name: null })
    const { container } = render(<NoteCard note={note} />)

    expect(container.querySelector('.note-card-project')).not.toBeInTheDocument()
  })
})
