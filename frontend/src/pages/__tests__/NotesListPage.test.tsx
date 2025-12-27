import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/utils'
import NotesListPage from '../NotesListPage'

// Mock API modules
vi.mock('../../api/notes', () => ({
  getNotes: vi.fn(),
}))

vi.mock('../../api/tags', () => ({
  getTags: vi.fn(),
}))

vi.mock('../../api/folders', () => ({
  getFolders: vi.fn(),
}))

import { getNotes } from '../../api/notes'
import { getTags } from '../../api/tags'
import { getFolders } from '../../api/folders'

const mockNotes = {
  items: [
    {
      id: 1,
      title: 'Test Note 1',
      folder_path: '/',
      is_pinned: true,
      is_readonly: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      tags: [{ id: 1, name: 'react' }],
      cover_file_url: null,
    },
    {
      id: 2,
      title: 'Test Note 2',
      folder_path: '/docs',
      is_pinned: false,
      is_readonly: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      tags: [],
      cover_file_url: null,
    },
  ],
  total: 2,
  page: 1,
  page_size: 12,
}

const mockTags = [
  { id: 1, name: 'react' },
  { id: 2, name: 'typescript' },
]

const mockFolders = [
  { id: 1, name: 'Documents', path: '/docs', parent_id: null },
  { id: 2, name: 'Projects', path: '/projects', parent_id: null },
]

describe('NotesListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getNotes as ReturnType<typeof vi.fn>).mockResolvedValue(mockNotes)
    ;(getTags as ReturnType<typeof vi.fn>).mockResolvedValue(mockTags)
    ;(getFolders as ReturnType<typeof vi.fn>).mockResolvedValue(mockFolders)
  })

  it('renders page title', async () => {
    render(<NotesListPage />)

    expect(screen.getByText('ノート一覧')).toBeInTheDocument()
  })

  it('renders new note button', () => {
    render(<NotesListPage />)

    expect(screen.getByRole('link', { name: /新規ノート/ })).toHaveAttribute('href', '/notes/new')
  })

  it('renders search form', () => {
    render(<NotesListPage />)

    expect(screen.getByPlaceholderText('ノートを検索...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '検索' })).toBeInTheDocument()
  })

  it('displays loading state', () => {
    ;(getNotes as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}))
    render(<NotesListPage />)

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('displays notes when loaded', async () => {
    render(<NotesListPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Note 1')).toBeInTheDocument()
      expect(screen.getByText('Test Note 2')).toBeInTheDocument()
    })
  })

  it('displays total count', async () => {
    render(<NotesListPage />)

    await waitFor(() => {
      expect(screen.getByText('2件のノート')).toBeInTheDocument()
    })
  })

  it('shows empty state when no notes', async () => {
    ;(getNotes as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 12,
    })
    render(<NotesListPage />)

    await waitFor(() => {
      expect(screen.getByText('ノートがありません')).toBeInTheDocument()
    })
  })

  it('shows create button in empty state', async () => {
    ;(getNotes as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 12,
    })
    render(<NotesListPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '最初のノートを作成' })).toBeInTheDocument()
    })
  })

  it('toggles filter panel', async () => {
    render(<NotesListPage />)

    // Filter panel should be hidden initially
    expect(screen.queryByText('タグ')).not.toBeInTheDocument()

    // Click filter button
    const filterButton = screen.getByRole('button', { name: '' })
    fireEvent.click(filterButton)

    // Filter panel should be visible
    await waitFor(() => {
      expect(screen.getByText('タグ')).toBeInTheDocument()
      expect(screen.getByText('フォルダ')).toBeInTheDocument()
    })
  })

  it('displays tag filter options', async () => {
    render(<NotesListPage />)

    // Open filters
    const filterButton = screen.getByRole('button', { name: '' })
    fireEvent.click(filterButton)

    await waitFor(() => {
      expect(screen.getByText('すべてのタグ')).toBeInTheDocument()
    })
  })

  it('displays folder filter options', async () => {
    render(<NotesListPage />)

    // Open filters
    const filterButton = screen.getByRole('button', { name: '' })
    fireEvent.click(filterButton)

    await waitFor(() => {
      expect(screen.getByText('すべてのフォルダ')).toBeInTheDocument()
    })
  })

  it('handles search submission', async () => {
    render(<NotesListPage />)

    const searchInput = screen.getByPlaceholderText('ノートを検索...')
    const searchButton = screen.getByRole('button', { name: '検索' })

    fireEvent.change(searchInput, { target: { value: 'test query' } })
    fireEvent.click(searchButton)

    // Wait for search to be triggered
    await waitFor(() => {
      expect(getNotes).toHaveBeenCalled()
    })
  })
})
