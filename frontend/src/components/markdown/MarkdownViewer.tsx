import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import mermaid from 'mermaid'
import 'katex/dist/katex.min.css'
import { NoteLinkHoverCard } from '../notes/NoteLinkHoverCard'
import { ProjectLinkHoverCard } from '../notes/ProjectLinkHoverCard'
import { FileViewerModal } from '../files'
import { getNoteSummary } from '../../api/notes'
import { getProjectSummary } from '../../api/projects'

// Initialize mermaid with configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  fontFamily: 'inherit',
})

interface MarkdownViewerProps {
  content: string
  className?: string
}

// Inline code component - only handles inline code (not inside pre)
function InlineCode({
  className,
  children,
  ...props
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <code className={className} {...props}>
      {children}
    </code>
  )
}

// Pre block component to handle code blocks and mermaid
function PreBlock({
  children,
  ...props
}: {
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  // Extract code element props from children
  const codeElement = Array.isArray(children) ? children[0] : children
  const codeProps = (codeElement as React.ReactElement)?.props || {}
  const className = codeProps.className || ''
  const codeChildren = codeProps.children

  const match = /language-(\w+)/.exec(className)
  const language = match ? match[1] : ''
  const code = String(codeChildren).replace(/\n$/, '')

  useEffect(() => {
    if (language === 'mermaid' && ref.current) {
      const renderMermaid = async () => {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
          const { svg } = await mermaid.render(id, code)
          setSvg(svg)
          setError('')
        } catch (err) {
          setError('Mermaid diagram rendering failed')
          console.error('Mermaid error:', err)
        }
      }
      renderMermaid()
    }
  }, [code, language])

  // Mermaid diagram
  if (language === 'mermaid') {
    if (error) {
      return (
        <div className="mermaid-error">
          <span>{error}</span>
          <pre>{code}</pre>
        </div>
      )
    }
    return <div ref={ref} className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
  }

  // Regular code block
  return (
    <pre className={className} {...props}>
      <code>{codeChildren}</code>
    </pre>
  )
}

// Extract note IDs from [#ID] pattern
function extractNoteLinkIds(content: string): number[] {
  const pattern = /\[#(\d+)\]/g
  const ids: number[] = []
  let match
  while ((match = pattern.exec(content)) !== null) {
    const id = parseInt(match[1], 10)
    if (!ids.includes(id)) {
      ids.push(id)
    }
  }
  return ids
}

// Hook to fetch note titles for [#ID] pattern replacement
function useNoteTitles(noteIds: number[]) {
  const [titles, setTitles] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (noteIds.length === 0) return

    const fetchTitles = async () => {
      setLoading(true)
      const newTitles = new Map<number, string>()

      await Promise.all(
        noteIds.map(async (id) => {
          try {
            const summary = await getNoteSummary(id)
            newTitles.set(id, summary.title)
          } catch {
            // If note doesn't exist, use fallback
            newTitles.set(id, `#${id}`)
          }
        })
      )

      setTitles(newTitles)
      setLoading(false)
    }

    fetchTitles()
  }, [noteIds.join(',')]) // Re-fetch when IDs change

  return { titles, loading }
}

// Replace [#ID] patterns with [タイトル](/notes/ID) format
function replaceNoteLinkPatterns(content: string, titles: Map<number, string>): string {
  return content.replace(/\[#(\d+)\]/g, (match, idStr) => {
    const id = parseInt(idStr, 10)
    const title = titles.get(id) || `#${id}`
    return `[${title}](/notes/${id})`
  })
}

// Extract project IDs from @P<ID> pattern
function extractProjectLinkIds(content: string): number[] {
  const pattern = /@P(\d+)/g
  const ids: number[] = []
  let match
  while ((match = pattern.exec(content)) !== null) {
    const id = parseInt(match[1], 10)
    if (!ids.includes(id)) {
      ids.push(id)
    }
  }
  return ids
}

// Hook to fetch project names for @P<ID> pattern replacement
function useProjectNames(projectIds: number[]) {
  const [names, setNames] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (projectIds.length === 0) return

    const fetchNames = async () => {
      setLoading(true)
      const newNames = new Map<number, string>()

      await Promise.all(
        projectIds.map(async (id) => {
          try {
            const summary = await getProjectSummary(id)
            const displayName = summary.company_name
              ? `${summary.company_name}/${summary.name}`
              : summary.name
            newNames.set(id, displayName)
          } catch {
            // If project doesn't exist, use fallback
            newNames.set(id, `P${id}`)
          }
        })
      )

      setNames(newNames)
      setLoading(false)
    }

    fetchNames()
  }, [projectIds.join(',')]) // Re-fetch when IDs change

  return { names, loading }
}

// Replace @P<ID> patterns with [プロジェクト名](/projects/ID) format
function replaceProjectLinkPatterns(content: string, names: Map<number, string>): string {
  return content.replace(/@P(\d+)/g, (_match, idStr) => {
    const id = parseInt(idStr, 10)
    const name = names.get(id) || `P${id}`
    return `[${name}](/projects/${id})`
  })
}

// Sanitize HTML by stripping dangerous tags and attributes
function sanitizeContent(content: string): string {
  // Remove script tags
  let sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove on* event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')

  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""')

  // Remove data: URLs in src attributes (potential XSS vector)
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""')

  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '')

  // Remove style tags
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // Remove form and input elements
  sanitized = sanitized.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
  sanitized = sanitized.replace(/<input\b[^>]*>/gi, '')
  sanitized = sanitized.replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '')

  return sanitized
}

// Extract text content from React children recursively
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('')
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren((children as React.ReactElement).props.children)
  }
  return ''
}

// Slugify function matching backend's markdown.py slugify
function slugify(text: string): string {
  // Remove special characters, keep alphanumeric, spaces, and Japanese characters
  let slug = text.replace(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff-]/g, '')
  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-')
  // Lowercase
  slug = slug.toLowerCase()
  return slug || 'section'
}

// Custom heading component to add anchor IDs for TOC navigation
function HeadingComponent({
  level,
  children,
  ...props
}: {
  level: number
  children?: React.ReactNode
}) {
  // Extract text from React children (handles nested elements like <strong>)
  const text = extractTextFromChildren(children)
  // Generate ID matching backend slugify format
  const id = slugify(text)

  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  return (
    <Tag id={id} {...props}>
      {children}
    </Tag>
  )
}

// Check if URL is a previewable file (PDF or image)
function isPreviewableFileUrl(url: string): {
  isPreviewable: boolean
  fileId: number | null
  mimeType: string
} {
  // Check for API file URLs: /api/files/{id} or http://localhost:8000/api/files/{id}
  const fileApiMatch = url.match(/\/api\/files\/(\d+)(?:\/preview)?(?:\?.*)?$/)
  if (fileApiMatch) {
    const fileId = parseInt(fileApiMatch[1], 10)
    // Determine mime type from URL or file extension in link text
    return { isPreviewable: true, fileId, mimeType: 'application/octet-stream' }
  }

  // Check for common file extensions
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  const previewableExtensions: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  }

  if (ext && previewableExtensions[ext]) {
    return { isPreviewable: true, fileId: null, mimeType: previewableExtensions[ext] }
  }

  return { isPreviewable: false, fileId: null, mimeType: '' }
}

// Extract file info from link text for mime type detection
function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    json: 'application/json',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

// Custom link component factory to handle file previews
function createLinkComponent(
  onFilePreview: (file: {
    id: number
    original_name: string
    mime_type: string
    url: string
  }) => void
) {
  return function LinkComponent({
    href,
    children,
    ...props
  }: {
    href?: string
    children: React.ReactNode
  }) {
    // Handle internal note links (#123 format)
    if (href?.startsWith('#') && /^#\d+$/.test(href)) {
      const noteId = parseInt(href.slice(1), 10)
      return (
        <NoteLinkHoverCard noteId={noteId}>
          <a href={`/notes/${noteId}`} className="note-link" {...props}>
            {children}
          </a>
        </NoteLinkHoverCard>
      )
    }

    // Handle internal note links (/notes/ID format - from [#ID] conversion)
    const notePathMatch = href?.match(/^\/notes\/(\d+)$/)
    if (notePathMatch) {
      const noteId = parseInt(notePathMatch[1], 10)
      return (
        <NoteLinkHoverCard noteId={noteId}>
          <a href={href} className="note-link" {...props}>
            {children}
          </a>
        </NoteLinkHoverCard>
      )
    }

    // Handle internal project links (/projects/ID format - from @P<ID> conversion)
    const projectPathMatch = href?.match(/^\/projects\/(\d+)$/)
    if (projectPathMatch) {
      const projectId = parseInt(projectPathMatch[1], 10)
      return (
        <ProjectLinkHoverCard projectId={projectId}>
          <a href={href} className="project-link" {...props}>
            {children}
          </a>
        </ProjectLinkHoverCard>
      )
    }

    // Check if this is a previewable file link
    if (href) {
      const { isPreviewable, fileId } = isPreviewableFileUrl(href)
      if (isPreviewable && fileId !== null) {
        const fileName = extractTextFromChildren(children)
        const mimeType = getMimeTypeFromFileName(fileName)

        const handleClick = (e: React.MouseEvent) => {
          e.preventDefault()
          onFilePreview({
            id: fileId,
            original_name: fileName,
            mime_type: mimeType,
            url: href,
          })
        }

        return (
          <a
            href={href}
            onClick={handleClick}
            className="file-preview-link"
            title="クリックでプレビュー"
            {...props}
          >
            {children}
          </a>
        )
      }
    }

    // External links open in new tab
    const isExternal = href?.startsWith('http://') || href?.startsWith('https://')
    if (isExternal) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      )
    }

    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
}

// File preview state type
interface PreviewFile {
  id: number
  original_name: string
  mime_type: string
  url?: string
}

// Mask code blocks and HTML tags to prevent processing inside them
function maskCodeBlocks(text: string): { masked: string; placeholders: Map<string, string> } {
  const placeholders = new Map<string, string>()
  let counter = 0

  // Handle code blocks ```...```
  let masked = text.replace(/```[\s\S]*?```/g, (match) => {
    const key = `__CODE_BLOCK_${counter++}__`
    placeholders.set(key, match)
    return key
  })

  // Handle inline code `...`
  masked = masked.replace(/`[^`]*`/g, (match) => {
    const key = `__INLINE_CODE_${counter++}__`
    placeholders.set(key, match)
    return key
  })

  // Handle existing HTML tags (em, strong) to prevent double processing
  masked = masked.replace(/<(em|strong)[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
    const key = `__HTML_TAG_${counter++}__`
    placeholders.set(key, match)
    return key
  })

  return { masked, placeholders }
}

// Restore masked code blocks and HTML tags
function unmaskCodeBlocks(text: string, placeholders: Map<string, string>): string {
  return text.replace(/__(CODE_BLOCK|INLINE_CODE|HTML_TAG)_\d+__/g, (match) => {
    return placeholders.get(match) || match
  })
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  // Extract note IDs from [#ID] patterns
  const noteIds = useMemo(() => extractNoteLinkIds(content), [content])

  // Fetch titles for extracted note IDs
  const { titles, loading: titlesLoading } = useNoteTitles(noteIds)

  // Extract project IDs from @P<ID> patterns
  const projectIds = useMemo(() => extractProjectLinkIds(content), [content])

  // Fetch names for extracted project IDs
  const { names: projectNames } = useProjectNames(projectIds)

  // File preview modal state
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Handle file preview
  const handleFilePreview = useCallback((file: PreviewFile) => {
    setPreviewFile(file)
    setIsPreviewOpen(true)
  }, [])

  // Close preview modal
  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false)
    setPreviewFile(null)
  }, [])

  // Create link component with file preview handler
  const LinkComponentWithPreview = useMemo(
    () => createLinkComponent(handleFilePreview),
    [handleFilePreview]
  )

  // Fix Japanese punctuation issue with bold/italic markers
  // CommonMark parser doesn't recognize ** after full-width punctuation as emphasis start
  // Solution: Convert problematic **text** patterns directly to <strong>text</strong> HTML
  const fixJapaneseEmphasis = (text: string): string => {
    // Pattern: Japanese punctuation followed by **text** (non-greedy match)
    // This converts directly to HTML since CommonMark can't parse these cases
    let result = text

    // Handle bold (**text**) after Japanese punctuation or at start of line after Japanese text
    // Extended to include Hiragana, Katakana, Kanji
    // Note: Exclude newlines from content capture to prevent spanning across lines/list items
    result = result.replace(
      /([、。！？：；）」』】〉》〕\u3000\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff])(\*\*)([^*\n]+?)(\*\*)(?!\*)/g,
      '$1<strong>$3</strong>'
    )

    // Also handle cases where bold is followed by Japanese text without space
    // Extended lookahead to include EOL ($) and Newline (\n) and Japanese chars
    result = result.replace(
      /(\*\*)([^*\n]+?)(\*\*)(?=[、。！？：；（「『【〈《〔\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]|$|\n)/g,
      '<strong>$2</strong>'
    )

    // Handle bold text containing Japanese characters (catches remaining cases like line-end or standalone)
    // This covers: これは**太字** (line-end) and **テスト** (standalone)
    result = result.replace(
      /\*\*([^*]*[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff][^*]*)\*\*/g,
      '<strong>$1</strong>'
    )

    // Handle italic (*text*) - must come after bold processing
    // Only process single * that are not part of ** (bold)
    // Match single asterisks with Japanese characters, avoiding already processed HTML
    result = result.replace(
      /(?<!\*)\*([^*\n]*[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff][^*\n]*?)\*(?!\*)/g,
      '<em>$1</em>'
    )

    return result
  }

  // Process content: replace [#ID] and @P<ID> patterns, then sanitize
  const processedContent = useMemo(() => {
    let processed = content
    if (titles.size > 0) {
      processed = replaceNoteLinkPatterns(processed, titles)
    }
    if (projectNames.size > 0) {
      processed = replaceProjectLinkPatterns(processed, projectNames)
    }

    // Mask code blocks before fixing emphasis to avoid corrupting code
    const { masked, placeholders } = maskCodeBlocks(processed)
    processed = masked

    processed = fixJapaneseEmphasis(processed)

    // Unmask code blocks
    processed = unmaskCodeBlocks(processed, placeholders)

    return sanitizeContent(processed)
  }, [content, titles, projectNames])

  return (
    <div className={`markdown-content ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
        components={{
          code: InlineCode as any,
          pre: PreBlock as any,
          a: LinkComponentWithPreview as any,
          h1: (props) => <HeadingComponent level={1} {...props} />,
          h2: (props) => <HeadingComponent level={2} {...props} />,
          h3: (props) => <HeadingComponent level={3} {...props} />,
          h4: (props) => <HeadingComponent level={4} {...props} />,
          h5: (props) => <HeadingComponent level={5} {...props} />,
          h6: (props) => <HeadingComponent level={6} {...props} />,
        }}
      >
        {processedContent}
      </ReactMarkdown>

      {/* File Preview Modal */}
      <FileViewerModal isOpen={isPreviewOpen} onClose={handleClosePreview} file={previewFile} />
    </div>
  )
}
