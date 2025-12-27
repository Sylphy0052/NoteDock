import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../../test/utils'
import { MarkdownViewer } from '../MarkdownViewer'

// Mock mermaid to avoid DOM issues in tests
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg>mocked</svg>' }),
  },
}))

describe('MarkdownViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders plain text', () => {
    render(<MarkdownViewer content="Hello World" />)

    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders markdown heading', () => {
    render(<MarkdownViewer content="# Heading 1" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading 1')
  })

  it('renders inline code', () => {
    render(<MarkdownViewer content="This is `inline code` text" />)

    const code = screen.getByText('inline code')
    expect(code.tagName).toBe('CODE')
  })

  it('renders code blocks', () => {
    const codeBlock = `\`\`\`javascript
const x = 1;
\`\`\``
    const { container } = render(<MarkdownViewer content={codeBlock} />)

    expect(container.querySelector('pre code')).toBeInTheDocument()
    expect(container.textContent).toContain('const')
    expect(container.textContent).toContain('x = 1')
  })

  it('renders links', () => {
    render(<MarkdownViewer content="[Link Text](https://example.com)" />)

    const link = screen.getByRole('link', { name: 'Link Text' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders internal note links', () => {
    render(<MarkdownViewer content="See note [#123](#123)" />)

    const link = screen.getByRole('link', { name: '#123' })
    expect(link).toHaveAttribute('href', '/notes/123')
    expect(link).toHaveClass('note-link')
  })

  it('applies custom className', () => {
    const { container } = render(<MarkdownViewer content="Test" className="custom-class" />)

    expect(container.querySelector('.markdown-content')).toHaveClass('custom-class')
  })

  it('sanitizes script tags', () => {
    render(<MarkdownViewer content="<script>alert('xss')</script>Safe text" />)

    expect(screen.getByText('Safe text')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })

  it('renders GFM tables', () => {
    const tableMarkdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`
    render(<MarkdownViewer content={tableMarkdown} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Header 1')).toBeInTheDocument()
    expect(screen.getByText('Cell 1')).toBeInTheDocument()
  })

  it('renders strikethrough text', () => {
    render(<MarkdownViewer content="~~strikethrough~~" />)

    const del = document.querySelector('del')
    expect(del).toBeInTheDocument()
    expect(del).toHaveTextContent('strikethrough')
  })

  it('renders bold text', () => {
    render(<MarkdownViewer content="**bold text**" />)

    const strong = document.querySelector('strong')
    expect(strong).toBeInTheDocument()
    expect(strong).toHaveTextContent('bold text')
  })

  it('renders italic text', () => {
    render(<MarkdownViewer content="*italic text*" />)

    const em = document.querySelector('em')
    expect(em).toBeInTheDocument()
    expect(em).toHaveTextContent('italic text')
  })

  it('renders blockquotes', () => {
    render(<MarkdownViewer content="> This is a quote" />)

    const blockquote = document.querySelector('blockquote')
    expect(blockquote).toBeInTheDocument()
    expect(blockquote).toHaveTextContent('This is a quote')
  })

  it('renders images', () => {
    render(<MarkdownViewer content="![Alt text](https://example.com/image.jpg)" />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg')
    expect(img).toHaveAttribute('alt', 'Alt text')
  })

  it('renders inline LaTeX math', () => {
    const { container } = render(<MarkdownViewer content="The equation $E=mc^2$ is famous." />)

    // KaTeX renders math in span with class 'katex'
    const katex = container.querySelector('.katex')
    expect(katex).toBeInTheDocument()
  })

  it('renders block LaTeX math', () => {
    const { container } = render(
      <MarkdownViewer content={`The quadratic formula:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

is important.`} />
    )

    // KaTeX renders display math with .katex class
    const katexElements = container.querySelectorAll('.katex')
    expect(katexElements.length).toBeGreaterThan(0)
  })

  it('renders multiple LaTeX expressions', () => {
    const { container } = render(
      <MarkdownViewer content="Inline $a^2$ and $b^2$ then block: $$c^2 = a^2 + b^2$$" />
    )

    const katexElements = container.querySelectorAll('.katex')
    expect(katexElements.length).toBeGreaterThanOrEqual(2)
  })
})
