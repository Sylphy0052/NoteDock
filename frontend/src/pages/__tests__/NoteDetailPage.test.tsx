import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../../components/common/Toast'
import NoteDetailPage from '../NoteDetailPage'

// Mock API modules
vi.mock('../../api/notes', () => ({
  getNote: vi.fn(),
  deleteNote: vi.fn(),
  toggleNotePin: vi.fn(),
  toggleNoteReadonly: vi.fn(),
  duplicateNote: vi.fn(),
  getNoteToc: vi.fn(),
  getNoteVersions: vi.fn(),
}))

vi.mock('../../api/comments', () => ({
  getComments: vi.fn(),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
}))

vi.mock('../../api/files', () => ({
  getFileDownloadUrl: vi.fn(),
}))

// Mock mermaid
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg>mocked</svg>' }),
  },
}))

import { getNote, getNoteToc, getNoteVersions } from '../../api/notes'
import { getComments } from '../../api/comments'

const mockNote = {
  id: 1,
  title: 'Test Note Title',
  content_md: '# Hello World\n\nThis is test content.',
  folder_path: '/',
  folder: { id: 1, name: 'Documents' },
  is_pinned: false,
  is_readonly: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  deleted_at: null,
  version_no: 1,
  tags: [{ id: 1, name: 'test-tag' }],
  files: [],
}

const mockTocItems = [{ id: 'hello-world', level: 1, text: 'Hello World' }]

const mockComments = [
  {
    id: 1,
    display_name: 'User1',
    content: 'Great note!',
    created_at: '2024-01-02T10:00:00Z',
    replies: [],
  },
]

function renderWithProviders(noteId: string = '1') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[`/notes/${noteId}`]}>
          <Routes>
            <Route path="/notes/:noteId" element={<NoteDetailPage />} />
            <Route path="/notes" element={<div>Notes List</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe('NoteDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getNote as ReturnType<typeof vi.fn>).mockResolvedValue(mockNote)
    ;(getNoteToc as ReturnType<typeof vi.fn>).mockResolvedValue(mockTocItems)
    ;(getComments as ReturnType<typeof vi.fn>).mockResolvedValue(mockComments)
    ;(getNoteVersions as ReturnType<typeof vi.fn>).mockResolvedValue([])
  })

  it('displays loading state initially', () => {
    ;(getNote as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}))
    renderWithProviders()

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('renders note title', async () => {
    renderWithProviders()

    await waitFor(() => {
      // Title appears in breadcrumb and as h1, so use getAllByText
      const titles = screen.getAllByText('Test Note Title')
      expect(titles.length).toBeGreaterThan(0)
      // Verify the main title h1 exists
      expect(screen.getByRole('heading', { name: 'Test Note Title', level: 1 })).toBeInTheDocument()
    })
  })

  it('renders note content in markdown', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello World' })).toBeInTheDocument()
    })
  })

  it('shows edit button when not readonly', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /編集/ })).toHaveAttribute('href', '/notes/1/edit')
    })
  })

  it('hides edit button when readonly', async () => {
    ;(getNote as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockNote,
      is_readonly: true,
    })
    renderWithProviders()

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /編集/ })).not.toBeInTheDocument()
    })
  })

  it('displays tags', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('test-tag')).toBeInTheDocument()
    })
  })

  it('displays pinned badge when pinned', async () => {
    ;(getNote as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockNote,
      is_pinned: true,
    })
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('ピン留め')).toBeInTheDocument()
    })
  })

  it('displays readonly badge when readonly', async () => {
    ;(getNote as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockNote,
      is_readonly: true,
    })
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('閲覧専用')).toBeInTheDocument()
    })
  })

  it('renders breadcrumb navigation', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'ノート' })).toHaveAttribute('href', '/notes')
    })
  })

  it('displays folder in breadcrumb', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument()
    })
  })

  it('shows error state when note not found', async () => {
    ;(getNote as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'))
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('ノートが見つかりません')).toBeInTheDocument()
    })
  })

  it('shows back to list link on error', async () => {
    ;(getNote as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'))
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'ノート一覧に戻る' })).toBeInTheDocument()
    })
  })

  it('renders table of contents when available', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('目次')).toBeInTheDocument()
    })
  })

  it('renders comment section', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/コメント/)).toBeInTheDocument()
    })
  })

  it('displays existing comments', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('Great note!')).toBeInTheDocument()
      expect(screen.getByText('User1')).toBeInTheDocument()
    })
  })

  it('shows comment form', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('表示名')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('コメントを入力...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '投稿' })).toBeInTheDocument()
    })
  })

  it('displays updated date', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/更新:/)).toBeInTheDocument()
    })
  })
})
