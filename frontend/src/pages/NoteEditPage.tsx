import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Save,
  Eye,
  Edit as EditIcon,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Upload,
  X,
  ChevronRight,
  ImagePlus,
  Paperclip,
  Trash2,
  Download,
  File,
  Lock,
  AlertTriangle,
  FileText,
  MoreVertical,
  FolderPlus,
  Settings,
  User,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { MarkdownViewer } from '../components/markdown'
import {
  ImageInsertModal,
  FileInsertModal,
  NoteLinkSuggester,
  ProjectLinkSuggester,
} from '../components/editor'
import { TemplateSelectModal, SaveAsTemplateModal } from '../components/templates'
import { AIGenerateModal, AIAssistModal, AITagSuggestModal } from '../components/ai'
import { useAIStatus, useProjects } from '../hooks'
import {
  getNote,
  createNote,
  updateNote,
  checkEditLock,
  acquireEditLock,
  releaseEditLock,
  refreshEditLock,
} from '../api/notes'
import { uploadFile, getFileDownloadUrl } from '../api/files'
import { getFolders, createFolder } from '../api/folders'
import { getTags } from '../api/tags'
import {
  checkDraft,
  checkDraftByNoteId,
  saveDraft as saveDraftApi,
  deleteDraft as deleteDraftApi,
  deleteDraftByNoteId,
  type Draft,
} from '../api/drafts'
import { useToast } from '../components/common'
import { getFileUrl as toAbsoluteUrl } from '../utils/api'
import type { NoteCreate, NoteUpdate } from '../api/types'

// Generate a unique session ID for draft management
function getOrCreateSessionId(): string {
  const key = 'notedock_session_id'
  let sessionId = sessionStorage.getItem(key)
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    sessionStorage.setItem(key, sessionId)
  }
  return sessionId
}

// Editor Toolbar
interface ToolbarProps {
  onInsert: (prefix: string, suffix: string) => void
  onUploadImage: () => void
  onUploadFile: () => void
  onAIGenerate?: () => void
  onAIAssist?: () => void
  aiEnabled?: boolean
}

function EditorToolbar({ onInsert, onUploadImage, onUploadFile, onAIGenerate, onAIAssist, aiEnabled }: ToolbarProps) {
  const tools = [
    { icon: <Bold size={16} />, action: () => onInsert('**', '**'), title: '太字' },
    { icon: <Italic size={16} />, action: () => onInsert('*', '*'), title: '斜体' },
    { icon: <Heading1 size={16} />, action: () => onInsert('# ', ''), title: '見出し1' },
    { icon: <Heading2 size={16} />, action: () => onInsert('## ', ''), title: '見出し2' },
    { icon: <Heading3 size={16} />, action: () => onInsert('### ', ''), title: '見出し3' },
    { icon: <List size={16} />, action: () => onInsert('- ', ''), title: '箇条書き' },
    { icon: <ListOrdered size={16} />, action: () => onInsert('1. ', ''), title: '番号付き' },
    { icon: <Quote size={16} />, action: () => onInsert('> ', ''), title: '引用' },
    { icon: <Code size={16} />, action: () => onInsert('`', '`'), title: 'コード' },
    { icon: <LinkIcon size={16} />, action: () => onInsert('[', '](url)'), title: 'リンク' },
    { icon: <Image size={16} />, action: onUploadImage, title: '画像' },
    { icon: <Paperclip size={16} />, action: onUploadFile, title: 'ファイル' },
  ]

  return (
    <div className="editor-toolbar">
      {tools.map((tool, index) => (
        <button
          key={index}
          type="button"
          className="toolbar-btn"
          onClick={tool.action}
          title={tool.title}
        >
          {tool.icon}
        </button>
      ))}
      {aiEnabled && (
        <>
          <div className="toolbar-separator" />
          {onAIGenerate && (
            <button
              type="button"
              className="toolbar-btn toolbar-btn-ai"
              onClick={onAIGenerate}
              title="AIで生成"
            >
              <Sparkles size={16} />
            </button>
          )}
          {onAIAssist && (
            <button
              type="button"
              className="toolbar-btn toolbar-btn-ai"
              onClick={onAIAssist}
              title="AIアシスト (選択テキストを改善・翻訳)"
            >
              <Wand2 size={16} />
            </button>
          )}
        </>
      )}
    </div>
  )
}

// Tag Input Component
interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch all tags for suggestions
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  })

  // Filter suggestions based on input
  const filteredSuggestions = allTags
    .map((t) => t.name)
    .filter(
      (name) =>
        !tags.includes(name) && (input === '' || name.toLowerCase().includes(input.toLowerCase()))
    )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        addTag(filteredSuggestions[selectedIndex])
      } else if (input.trim()) {
        addTag(input.trim())
      }
    } else if (e.key === ',') {
      e.preventDefault()
      if (input.trim()) {
        addTag(input.trim())
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
    }
    setInput('')
    setSelectedIndex(-1)
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    setSelectedIndex(-1)
    setShowSuggestions(true)
  }

  return (
    <div className="tag-input-container">
      <div className="tag-input-tags">
        {tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
            <button type="button" onClick={() => removeTag(tag)}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="タグを追加..."
          className="tag-input"
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="tag-suggestions">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              className={index === selectedIndex ? 'selected' : ''}
              onMouseDown={(e) => {
                e.preventDefault()
                addTag(suggestion)
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Attached file type
interface AttachedFile {
  id: number
  original_name: string
  mime_type: string
  size_bytes: number
}

export default function NoteEditPage() {
  const { noteId } = useParams<{ noteId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const isNew = !noteId || noteId === 'new'
  const id = isNew ? undefined : parseInt(noteId, 10)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [folderId, setFolderId] = useState<number | null>(null)
  const [projectId, setProjectId] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [isPinned, setIsPinned] = useState(false)
  const [isReadonly, setIsReadonly] = useState(false)
  const [isHiddenFromHome, setIsHiddenFromHome] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [coverFileId, setCoverFileId] = useState<number | null>(null)
  const [coverFileUrl, setCoverFileUrl] = useState<string | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(isNew)
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showAIGenerate, setShowAIGenerate] = useState(false)
  const [showAIAssist, setShowAIAssist] = useState(false)
  const [showAITagSuggest, setShowAITagSuggest] = useState(false)
  const [selectedText, setSelectedText] = useState('')

  // AI status
  const { data: aiStatus } = useAIStatus()

  // Edit lock state
  const [lockStatus, setLockStatus] = useState<{
    isLocked: boolean
    lockedBy: string | null
    showWarning: boolean
  }>({ isLocked: false, lockedBy: null, showWarning: false })
  const [displayName] = useState<string>(() => localStorage.getItem('notedock_display_name') || '')
  const isDisplayNameSet = displayName.trim() !== ''
  const lockRefreshIntervalRef = useRef<number | null>(null)

  // Draft auto-save state
  const [lastDraftSaved, setLastDraftSaved] = useState<Date | null>(null)
  const [showDraftRecovery, setShowDraftRecovery] = useState(false)
  const [recoveredDraft, setRecoveredDraft] = useState<Draft | null>(null)
  const draftAutoSaveIntervalRef = useRef<number | null>(null)
  const DRAFT_AUTO_SAVE_INTERVAL = 30 * 1000 // 30 seconds
  const sessionId = useRef<string>(getOrCreateSessionId())

  // Draft helper functions (API-based)
  const saveDraft = useCallback(async () => {
    if (!title && !content) return
    try {
      await saveDraftApi({
        session_id: sessionId.current,
        note_id: id || null,
        title,
        content_md: content,
        folder_id: folderId,
        tags,
      })
      setLastDraftSaved(new Date())
    } catch (err) {
      console.error('Failed to save draft:', err)
    }
  }, [title, content, folderId, tags, id])

  const loadDraft = useCallback(async (): Promise<Draft | null> => {
    try {
      if (id) {
        // For existing notes, check by note_id
        const response = await checkDraftByNoteId(id)
        return response.draft
      } else {
        // For new notes, check by session_id
        const response = await checkDraft(sessionId.current)
        return response.draft
      }
    } catch (err) {
      console.error('Failed to load draft:', err)
      return null
    }
  }, [id])

  const clearDraft = useCallback(async () => {
    try {
      if (id) {
        await deleteDraftByNoteId(id)
      } else {
        await deleteDraftApi(sessionId.current)
      }
      setLastDraftSaved(null)
    } catch (err) {
      console.error('Failed to clear draft:', err)
    }
  }, [id])

  // Fetch existing note
  const { data: note, isLoading } = useQuery({
    queryKey: ['note', id],
    queryFn: () => getNote(id!),
    enabled: !!id,
  })

  // Fetch folders
  const { data: folders } = useQuery({
    queryKey: ['folders'],
    queryFn: getFolders,
  })

  // Fetch projects
  const { data: projectsData } = useProjects({ page_size: 100 })

  // Populate form with existing note data
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content_md)
      setFolderId(note.folder_id)
      setProjectId(note.project_id)
      setTags(note.tags.map((t) => t.name))
      setIsPinned(note.is_pinned)
      setIsReadonly(note.is_readonly)
      setIsHiddenFromHome(note.is_hidden_from_home)
      setCoverFileId(note.cover_file_id)
      setCoverFileUrl(toAbsoluteUrl(note.cover_file_url))
      setAttachedFiles(note.files || [])
    }
  }, [note])

  // Check for draft recovery on mount
  useEffect(() => {
    const checkForDraft = async () => {
      const draft = await loadDraft()
      if (draft) {
        // For new notes, always check draft
        // For existing notes, check if draft is newer or has different content
        const shouldRecover = isNew
          ? draft.title || draft.content_md
          : note && (draft.title !== note.title || draft.content_md !== note.content_md)

        if (shouldRecover) {
          setRecoveredDraft(draft)
          setShowDraftRecovery(true)
        }
      }
    }
    checkForDraft()
  }, [loadDraft, isNew, note])

  // Draft auto-save interval
  useEffect(() => {
    // Start auto-save interval
    draftAutoSaveIntervalRef.current = window.setInterval(() => {
      if (isDirty) {
        saveDraft()
      }
    }, DRAFT_AUTO_SAVE_INTERVAL)

    return () => {
      if (draftAutoSaveIntervalRef.current) {
        clearInterval(draftAutoSaveIntervalRef.current)
      }
    }
  }, [isDirty, saveDraft])

  // Handle draft recovery
  const handleRecoverDraft = () => {
    if (recoveredDraft) {
      setTitle(recoveredDraft.title)
      setContent(recoveredDraft.content_md)
      if (recoveredDraft.folder_id) {
        setFolderId(recoveredDraft.folder_id)
      }
      if (recoveredDraft.tags.length > 0) {
        setTags(recoveredDraft.tags)
      }
      showToast('ドラフトを復元しました', 'success')
    }
    setShowDraftRecovery(false)
    setRecoveredDraft(null)
  }

  const handleDiscardDraft = async () => {
    await clearDraft()
    setShowDraftRecovery(false)
    setRecoveredDraft(null)
  }

  // Mark as dirty when content changes
  useEffect(() => {
    if (note) {
      const hasChanges =
        title !== note.title ||
        content !== note.content_md ||
        folderId !== note.folder_id ||
        isPinned !== note.is_pinned ||
        isReadonly !== note.is_readonly ||
        isHiddenFromHome !== note.is_hidden_from_home
      setIsDirty(hasChanges)
    } else if (isNew) {
      setIsDirty(title !== '' || content !== '')
    }
  }, [title, content, folderId, isPinned, isReadonly, isHiddenFromHome, note, isNew])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Edit lock: acquire on mount, release on unmount
  useEffect(() => {
    if (isNew || !id) return

    const tryAcquireLock = async () => {
      try {
        // First check if already locked
        const status = await checkEditLock(id)
        if (status.is_locked && status.locked_by !== displayName) {
          setLockStatus({
            isLocked: true,
            lockedBy: status.locked_by,
            showWarning: true,
          })
          return
        }

        // Try to acquire lock
        const result = await acquireEditLock(id, displayName)
        if (!result.success) {
          setLockStatus({
            isLocked: true,
            lockedBy: result.locked_by || null,
            showWarning: true,
          })
        } else {
          setLockStatus({ isLocked: false, lockedBy: null, showWarning: false })
          // Start refresh interval (every 10 minutes)
          lockRefreshIntervalRef.current = window.setInterval(
            async () => {
              try {
                await refreshEditLock(id, displayName)
              } catch (err) {
                console.error('Failed to refresh edit lock:', err)
              }
            },
            10 * 60 * 1000
          )
        }
      } catch (err) {
        console.error('Failed to check/acquire edit lock:', err)
      }
    }

    tryAcquireLock()

    // Cleanup: release lock on unmount
    return () => {
      if (lockRefreshIntervalRef.current) {
        clearInterval(lockRefreshIntervalRef.current)
      }
      if (id && !lockStatus.showWarning) {
        releaseEditLock(id, displayName).catch((err) =>
          console.error('Failed to release edit lock:', err)
        )
      }
    }
  }, [id, isNew, displayName])

  // Handle force acquire lock (ignore warning)
  const handleForceAcquireLock = async () => {
    if (!id) return
    try {
      const result = await acquireEditLock(id, displayName, true)
      if (result.success) {
        setLockStatus({ isLocked: false, lockedBy: null, showWarning: false })
        showToast('編集ロックを取得しました', 'success')
        // Start refresh interval
        lockRefreshIntervalRef.current = window.setInterval(
          async () => {
            try {
              await refreshEditLock(id, displayName)
            } catch (err) {
              console.error('Failed to refresh edit lock:', err)
            }
          },
          10 * 60 * 1000
        )
      }
    } catch (err) {
      showToast('ロックの取得に失敗しました', 'error')
    }
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: NoteCreate) => createNote(data),
    onSuccess: (data) => {
      clearDraft() // Clear draft after successful save
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      showToast('ノートを作成しました', 'success')
      navigate(`/notes/${data.id}`)
    },
    onError: () => {
      showToast('ノートの作成に失敗しました', 'error')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: NoteUpdate) => updateNote(id!, data),
    onSuccess: (data) => {
      clearDraft() // Clear draft after successful save
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      queryClient.setQueryData(['note', id], data)
      setIsDirty(false)
      showToast('ノートを保存しました', 'success')
    },
    onError: () => {
      showToast('ノートの保存に失敗しました', 'error')
    },
  })

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file),
    onSuccess: async (data) => {
      const url = await getFileDownloadUrl(data.id)
      const isImage = data.mime_type.startsWith('image/')
      const markdown = isImage
        ? `![${data.original_name}](${url})`
        : `[${data.original_name}](${url})`
      insertText(markdown)
      showToast('ファイルをアップロードしました', 'success')
    },
    onError: () => {
      showToast('ファイルのアップロードに失敗しました', 'error')
    },
  })

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: (name: string) => createFolder(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setFolderId(data.id)
      setShowCreateFolderModal(false)
      setNewFolderName('')
      showToast('フォルダを作成しました', 'success')
    },
    onError: () => {
      showToast('フォルダの作成に失敗しました', 'error')
    },
  })

  const insertText = useCallback(
    (prefix: string, suffix: string = '') => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = content.substring(start, end)
      const newContent =
        content.substring(0, start) + prefix + selectedText + suffix + content.substring(end)

      setContent(newContent)

      // Restore cursor position
      setTimeout(() => {
        textarea.focus()
        const newCursorPos = start + prefix.length + selectedText.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    },
    [content]
  )

  const handleSave = () => {
    if (!title.trim()) {
      showToast('タイトルを入力してください', 'error')
      return
    }

    if (isNew) {
      const createData: NoteCreate = {
        title: title.trim(),
        content_md: content,
        folder_id: folderId,
        project_id: projectId,
        tag_names: tags,
        is_pinned: isPinned,
        is_readonly: isReadonly,
        is_hidden_from_home: isHiddenFromHome,
        cover_file_id: coverFileId,
        created_by: displayName,
      }
      createMutation.mutate(createData)
    } else {
      const updateData: NoteUpdate = {
        title: title.trim(),
        content_md: content,
        folder_id: folderId,
        project_id: projectId,
        tag_names: tags,
        is_pinned: isPinned,
        is_readonly: isReadonly,
        is_hidden_from_home: isHiddenFromHome,
        cover_file_id: coverFileId,
        updated_by: displayName,
      }
      updateMutation.mutate(updateData)
    }
  }

  const handleFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleOpenImageModal = () => {
    setShowImageModal(true)
  }

  const handleImageInsert = (markdown: string) => {
    insertText(markdown)
    setShowImageModal(false)
  }

  const handleOpenFileModal = () => {
    setShowFileModal(true)
  }

  const handleFileInsert = (markdown: string) => {
    insertText(markdown)
    setShowFileModal(false)
  }

  const handleAIGeneratedContent = useCallback(
    (generatedContent: string) => {
      // Insert generated content at cursor position or append
      const textarea = textareaRef.current
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newContent =
          content.substring(0, start) + generatedContent + content.substring(end)
        setContent(newContent)

        // Move cursor to end of inserted content
        setTimeout(() => {
          const newCursorPos = start + generatedContent.length
          textarea.focus()
          textarea.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
      } else {
        // Fallback: append to content
        setContent((prev) => prev + (prev ? '\n\n' : '') + generatedContent)
      }
      setShowAIGenerate(false)
    },
    [content]
  )

  // Open AI Assist modal with selected text
  const handleOpenAIAssist = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea && aiStatus?.enabled) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selected = content.substring(start, end)
      if (selected) {
        setSelectedText(selected)
        setShowAIAssist(true)
      }
    }
  }, [content, aiStatus?.enabled])

  // Replace selected text with AI result
  const handleAIAssistReplace = useCallback(
    (replacementText: string) => {
      const textarea = textareaRef.current
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newContent =
          content.substring(0, start) + replacementText + content.substring(end)
        setContent(newContent)

        // Move cursor to end of replaced content
        setTimeout(() => {
          const newCursorPos = start + replacementText.length
          textarea.focus()
          textarea.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
      }
      setShowAIAssist(false)
      setSelectedText('')
    },
    [content]
  )

  // Handle note link insertion from suggester
  const handleNoteLinkInsert = useCallback(
    (noteId: number, _noteTitle: string) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const cursorPos = textarea.selectionStart
      const textBeforeCursor = content.substring(0, cursorPos)

      // Find the [# pattern to replace
      const triggerMatch = textBeforeCursor.match(/\[#([^\]\s]*)$/)
      if (triggerMatch) {
        const startPos = cursorPos - triggerMatch[0].length
        const newContent =
          content.substring(0, startPos) + `[#${noteId}]` + content.substring(cursorPos)

        setContent(newContent)

        // Move cursor after the inserted link
        setTimeout(() => {
          const newCursorPos = startPos + `[#${noteId}]`.length
          textarea.focus()
          textarea.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
      }
    },
    [content]
  )

  // Handle project link insertion from suggester
  const handleProjectLinkInsert = useCallback(
    (projectId: number, _projectName: string) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const cursorPos = textarea.selectionStart
      const textBeforeCursor = content.substring(0, cursorPos)

      // Find the @P pattern to replace
      const triggerMatch = textBeforeCursor.match(/@P([^\s]*)$/)
      if (triggerMatch) {
        const startPos = cursorPos - triggerMatch[0].length
        const newContent =
          content.substring(0, startPos) + `@P${projectId}` + content.substring(cursorPos)

        setContent(newContent)

        // Move cursor after the inserted link
        setTimeout(() => {
          const newCursorPos = startPos + `@P${projectId}`.length
          textarea.focus()
          textarea.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
      }
    },
    [content]
  )

  const handleTemplateSelect = (templateContent: string) => {
    setContent(templateContent)
    setShowTemplateModal(false)
  }

  const handleSaveAsTemplate = () => {
    setShowSaveTemplateModal(true)
    setShowMoreMenu(false)
  }

  const handleCoverUpload = () => {
    coverInputRef.current?.click()
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('カバー画像は画像ファイルを選択してください', 'error')
        return
      }
      try {
        const data = await uploadFile(file)
        const url = await getFileDownloadUrl(data.id)
        setCoverFileId(data.id)
        setCoverFileUrl(url)
        showToast('カバー画像を設定しました', 'success')
      } catch {
        showToast('カバー画像のアップロードに失敗しました', 'error')
      }
    }
  }

  const handleRemoveCover = () => {
    setCoverFileId(null)
    setCoverFileUrl(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      try {
        const data = await uploadFile(file)
        const url = await getFileDownloadUrl(data.id)
        const isImage = data.mime_type.startsWith('image/')
        const markdown = isImage
          ? `![${data.original_name}](${url})`
          : `[${data.original_name}](${url})`
        insertText(markdown)
        setAttachedFiles((prev) => [...prev, data])
        showToast(`${data.original_name} をアップロードしました`, 'success')
      } catch {
        showToast(`${file.name} のアップロードに失敗しました`, 'error')
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      // Ctrl+Alt+A for AI Assist
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'a') {
        e.preventDefault()
        handleOpenAIAssist()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleOpenAIAssist])

  if (!isNew && isLoading) {
    return (
      <div className="note-edit-page loading">
        <div className="spinner" />
        <span>読み込み中...</span>
      </div>
    )
  }

  if (!isNew && note?.is_readonly) {
    return (
      <div className="note-edit-page">
        <div className="edit-lock-warning">
          <div className="lock-warning-icon">
            <Lock size={48} />
          </div>
          <h2>このノートは編集がロックされています</h2>
          <p>このノートは閲覧専用に設定されているため、編集できません。</p>
          <p className="lock-warning-hint">
            編集を行うには、ノートの閲覧専用設定を解除してください。
          </p>
          <div className="lock-warning-actions">
            <Link to={`/notes/${id}`} className="btn btn-primary">
              <Eye size={18} />
              ノートを表示
            </Link>
            <Link to="/notes" className="btn btn-secondary">
              ノート一覧へ戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show edit lock warning (another user is editing)
  if (lockStatus.showWarning) {
    return (
      <div className="note-edit-page">
        <div className="edit-lock-warning">
          <div className="lock-warning-icon warning">
            <AlertTriangle size={48} />
          </div>
          <h2>現在他のユーザーが編集中です</h2>
          <p>
            <strong>{lockStatus.lockedBy}</strong> さんがこのノートを編集しています。
          </p>
          <p className="lock-warning-hint">
            閲覧のみ行うか、ロックを無視して編集を続行することができます。
            続行した場合、変更が競合する可能性があります。
          </p>
          <div className="lock-warning-actions">
            <Link to={`/notes/${id}`} className="btn btn-primary">
              <Eye size={18} />
              閲覧のみ
            </Link>
            <button className="btn btn-warning" onClick={handleForceAcquireLock}>
              <AlertTriangle size={18} />
              ロックを無視して編集
            </button>
            <Link to="/notes" className="btn btn-secondary">
              ノート一覧へ戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show display name required warning
  if (!isDisplayNameSet) {
    return (
      <div className="note-edit-page">
        <div className="edit-lock-warning">
          <div className="lock-warning-icon">
            <User size={48} />
          </div>
          <h2>表示名の設定が必要です</h2>
          <p>ノートを編集するには、まず設定画面で表示名を設定してください。</p>
          <p className="lock-warning-hint">表示名は、ノートの作成者・更新者として記録されます。</p>
          <div className="lock-warning-actions">
            <Link to="/settings" className="btn btn-primary">
              <Settings size={18} />
              設定画面へ
            </Link>
            <Link to="/notes" className="btn btn-secondary">
              ノート一覧へ戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="note-edit-page">
      {/* Draft Recovery Modal */}
      {showDraftRecovery && (
        <div className="modal-overlay">
          <div className="modal draft-recovery-modal">
            <header className="modal-header">
              <h2>
                <FileText size={20} />
                未保存のドラフトがあります
              </h2>
            </header>
            <div className="modal-body">
              <p>前回編集中のドラフトが見つかりました。復元しますか？</p>
              {recoveredDraft && (
                <div className="draft-preview">
                  <strong>タイトル:</strong> {recoveredDraft.title || '(無題)'}
                  <br />
                  <strong>内容:</strong> {recoveredDraft.content_md.substring(0, 100)}
                  {recoveredDraft.content_md.length > 100 ? '...' : ''}
                </div>
              )}
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={handleDiscardDraft}>
                破棄する
              </button>
              <button className="btn btn-primary" onClick={handleRecoverDraft}>
                復元する
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="edit-header">
        <div className="edit-breadcrumb">
          <Link to="/notes">ノート</Link>
          <ChevronRight size={16} />
          <span>{isNew ? '新規作成' : '編集'}</span>
          {lastDraftSaved && (
            <span className="draft-saved-indicator" title="最終ドラフト保存時刻">
              (ドラフト保存: {lastDraftSaved.toLocaleTimeString()})
            </span>
          )}
        </div>

        <div className="edit-actions">
          {isNew && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowTemplateModal(true)}
              title="テンプレートから作成"
            >
              <FileText size={18} />
              テンプレート
            </button>
          )}
          <button
            className={`btn btn-secondary ${showPreview ? 'active' : ''}`}
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? '編集モードに切り替え' : 'プレビューモードに切り替え'}
          >
            {showPreview ? <EditIcon size={18} /> : <Eye size={18} />}
            {showPreview ? '編集' : 'プレビュー'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save size={18} />
            保存
          </button>
          <div className="dropdown">
            <button
              className="btn btn-icon"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              title="その他のオプション"
            >
              <MoreVertical size={18} />
            </button>
            {showMoreMenu && (
              <div className="dropdown-menu">
                <button onClick={handleSaveAsTemplate}>
                  <FileText size={16} />
                  テンプレートとして保存
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="edit-layout">
        <div className="edit-sidebar">
          <div className="form-group">
            <label>フォルダ</label>
            <div className="folder-select-container">
              <select
                value={folderId || ''}
                onChange={(e) => {
                  if (e.target.value === '__create__') {
                    setShowCreateFolderModal(true)
                  } else {
                    setFolderId(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                }}
              >
                <option value="">なし</option>
                {(() => {
                  // Flatten folder tree for select options
                  const options: { id: number; name: string; depth: number }[] = []
                  const flatten = (items: typeof folders, depth = 0) => {
                    items?.forEach((folder) => {
                      options.push({ id: folder.id, name: folder.name, depth })
                      if (folder.children) {
                        flatten(folder.children, depth + 1)
                      }
                    })
                  }
                  flatten(folders)
                  return options.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {'　'.repeat(folder.depth)}
                      {folder.name}
                    </option>
                  ))
                })()}
                <option value="__create__">+ 新規フォルダを作成</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>プロジェクト</label>
            <select
              value={projectId || ''}
              onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">なし</option>
              {projectsData?.items.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.company ? `${project.company.name} / ` : ''}
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>タグ</label>
            <div className="tag-input-with-ai">
              <TagInput tags={tags} onChange={setTags} />
              {aiStatus?.enabled && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary ai-tag-suggest-btn"
                  onClick={() => setShowAITagSuggest(true)}
                  title="AIでタグを提案"
                >
                  <Sparkles size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
              />
              ピン留め
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isReadonly}
                onChange={(e) => setIsReadonly(e.target.checked)}
              />
              閲覧専用
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isHiddenFromHome}
                onChange={(e) => setIsHiddenFromHome(e.target.checked)}
              />
              ホームに表示しない
            </label>
          </div>

          {/* Cover Image */}
          <div className="form-group">
            <label>カバー画像</label>
            {coverFileUrl ? (
              <div className="cover-preview">
                <img src={coverFileUrl} alt="カバー" />
                <div className="cover-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleCoverUpload}
                  >
                    変更
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={handleRemoveCover}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="cover-upload-btn" onClick={handleCoverUpload}>
                <ImagePlus size={20} />
                <span>カバー画像を追加</span>
              </button>
            )}
          </div>

          {/* Attached Files */}
          {attachedFiles.length > 0 && (
            <div className="form-group">
              <label>
                <Paperclip size={14} />
                添付ファイル ({attachedFiles.length})
              </label>
              <ul className="attached-files-list">
                {attachedFiles.map((file) => (
                  <li key={file.id} className="attached-file-item">
                    <File size={14} />
                    <span className="file-name" title={file.original_name}>
                      {file.original_name}
                    </span>
                    <span className="file-size">{formatFileSize(file.size_bytes)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="edit-main">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトルを入力..."
            className="title-input"
          />

          {showPreview ? (
            <div className="preview-container">
              <MarkdownViewer content={content} />
            </div>
          ) : (
            <div
              ref={dropZoneRef}
              className={`editor-container ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <EditorToolbar
                onInsert={insertText}
                onUploadImage={handleOpenImageModal}
                onUploadFile={handleOpenFileModal}
                onAIGenerate={() => setShowAIGenerate(true)}
                onAIAssist={handleOpenAIAssist}
                aiEnabled={aiStatus?.enabled}
              />
              <div className="textarea-wrapper">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Markdownで入力...&#10;&#10;ヒント: [# でノートリンク、@P でプロジェクトリンクを挿入できます"
                  className="content-textarea"
                />
                <NoteLinkSuggester
                  textareaRef={textareaRef}
                  content={content}
                  onInsertLink={handleNoteLinkInsert}
                />
                <ProjectLinkSuggester
                  textareaRef={textareaRef}
                  content={content}
                  onInsertLink={handleProjectLinkInsert}
                />
              </div>
              {isDragging && (
                <div className="drop-overlay">
                  <Upload size={48} />
                  <span>ファイルをドロップしてアップロード</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
      />
      <input
        ref={coverInputRef}
        type="file"
        onChange={handleCoverChange}
        style={{ display: 'none' }}
        accept="image/*"
      />

      {/* Upload indicator */}
      {uploadMutation.isPending && (
        <div className="upload-indicator">
          <Upload size={16} />
          <span>アップロード中...</span>
        </div>
      )}

      {/* Image Insert Modal */}
      <ImageInsertModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={handleImageInsert}
      />

      {/* File Insert Modal */}
      <FileInsertModal
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        onInsert={handleFileInsert}
      />

      {/* Template Select Modal */}
      <TemplateSelectModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />

      {/* Save As Template Modal */}
      <SaveAsTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        content={content}
        defaultName={title}
        onSave={() => showToast('テンプレートを保存しました', 'success')}
      />

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="modal-overlay" onClick={() => setShowCreateFolderModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3>
                <FolderPlus size={20} />
                新規フォルダを作成
              </h3>
            </header>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="new-folder-name">フォルダ名</label>
                <input
                  id="new-folder-name"
                  type="text"
                  className="input"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="フォルダ名を入力"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFolderName.trim()) {
                      createFolderMutation.mutate(newFolderName.trim())
                    }
                  }}
                />
              </div>
            </div>
            <footer className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowCreateFolderModal(false)
                  setNewFolderName('')
                }}
              >
                キャンセル
              </button>
              <button
                className="btn btn-primary"
                onClick={() => createFolderMutation.mutate(newFolderName.trim())}
                disabled={!newFolderName.trim() || createFolderMutation.isPending}
              >
                {createFolderMutation.isPending ? '作成中...' : '作成'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      <AIGenerateModal
        isOpen={showAIGenerate}
        onClose={() => setShowAIGenerate(false)}
        onInsert={handleAIGeneratedContent}
      />

      {/* AI Assist Modal */}
      <AIAssistModal
        isOpen={showAIAssist}
        onClose={() => {
          setShowAIAssist(false)
          setSelectedText('')
        }}
        onReplace={handleAIAssistReplace}
        selectedText={selectedText}
      />

      {/* AI Tag Suggest Modal */}
      <AITagSuggestModal
        isOpen={showAITagSuggest}
        onClose={() => setShowAITagSuggest(false)}
        onApply={(newTags) => {
          setTags((prev) => [...prev, ...newTags.filter((t) => !prev.includes(t))])
        }}
        title={title}
        content={content}
        currentTags={tags}
      />
    </div>
  )
}
