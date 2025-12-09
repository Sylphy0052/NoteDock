import { useEffect, useRef, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import mermaid from "mermaid";
import { NoteLinkHoverCard } from "../notes/NoteLinkHoverCard";
import { getNoteSummary } from "../../api/notes";

// Initialize mermaid with configuration
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "strict",
  fontFamily: "inherit",
});

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

// Custom code component to handle mermaid blocks
function CodeBlock({
  inline,
  className,
  children,
  ...props
}: {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const code = String(children).replace(/\n$/, "");

  useEffect(() => {
    if (language === "mermaid" && ref.current) {
      const renderMermaid = async () => {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, code);
          setSvg(svg);
          setError("");
        } catch (err) {
          setError("Mermaid diagram rendering failed");
          console.error("Mermaid error:", err);
        }
      };
      renderMermaid();
    }
  }, [code, language]);

  // Mermaid diagram
  if (language === "mermaid") {
    if (error) {
      return (
        <div className="mermaid-error">
          <span>{error}</span>
          <pre>{code}</pre>
        </div>
      );
    }
    return (
      <div
        ref={ref}
        className="mermaid-diagram"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  // Inline code
  if (inline) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  // Regular code block
  return (
    <pre className={className}>
      <code {...props}>{children}</code>
    </pre>
  );
}

// Extract note IDs from [#ID] pattern
function extractNoteLinkIds(content: string): number[] {
  const pattern = /\[#(\d+)\]/g;
  const ids: number[] = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const id = parseInt(match[1], 10);
    if (!ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

// Hook to fetch note titles for [#ID] pattern replacement
function useNoteTitles(noteIds: number[]) {
  const [titles, setTitles] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (noteIds.length === 0) return;

    const fetchTitles = async () => {
      setLoading(true);
      const newTitles = new Map<number, string>();

      await Promise.all(
        noteIds.map(async (id) => {
          try {
            const summary = await getNoteSummary(id);
            newTitles.set(id, summary.title);
          } catch {
            // If note doesn't exist, use fallback
            newTitles.set(id, `#${id}`);
          }
        })
      );

      setTitles(newTitles);
      setLoading(false);
    };

    fetchTitles();
  }, [noteIds.join(",")]); // Re-fetch when IDs change

  return { titles, loading };
}

// Replace [#ID] patterns with [タイトル](/notes/ID) format
function replaceNoteLinkPatterns(
  content: string,
  titles: Map<number, string>
): string {
  return content.replace(/\[#(\d+)\]/g, (match, idStr) => {
    const id = parseInt(idStr, 10);
    const title = titles.get(id) || `#${id}`;
    return `[${title}](/notes/${id})`;
  });
}

// Sanitize HTML by stripping dangerous tags and attributes
function sanitizeContent(content: string): string {
  // Remove script tags
  let sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove on* event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");

  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');

  // Remove data: URLs in src attributes (potential XSS vector)
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');

  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, "");

  // Remove style tags
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove form and input elements
  sanitized = sanitized.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "");
  sanitized = sanitized.replace(/<input\b[^>]*>/gi, "");
  sanitized = sanitized.replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, "");

  return sanitized;
}

// Extract text content from React children recursively
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join("");
  }
  if (children && typeof children === "object" && "props" in children) {
    return extractTextFromChildren((children as React.ReactElement).props.children);
  }
  return "";
}

// Slugify function matching backend's markdown.py slugify
function slugify(text: string): string {
  // Remove special characters, keep alphanumeric, spaces, and Japanese characters
  let slug = text.replace(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff-]/g, "");
  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, "-");
  // Lowercase
  slug = slug.toLowerCase();
  return slug || "section";
}

// Custom heading component to add anchor IDs for TOC navigation
function HeadingComponent({
  level,
  children,
  ...props
}: {
  level: number;
  children?: React.ReactNode;
}) {
  // Extract text from React children (handles nested elements like <strong>)
  const text = extractTextFromChildren(children);
  // Generate ID matching backend slugify format
  const id = slugify(text);

  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return (
    <Tag id={id} {...props}>
      {children}
    </Tag>
  );
}

// Custom link component to open external links in new tab
function LinkComponent({
  href,
  children,
  ...props
}: {
  href?: string;
  children: React.ReactNode;
}) {
  // Handle internal note links (#123 format)
  if (href?.startsWith("#") && /^#\d+$/.test(href)) {
    const noteId = parseInt(href.slice(1), 10);
    return (
      <NoteLinkHoverCard noteId={noteId}>
        <a href={`/notes/${noteId}`} className="note-link" {...props}>
          {children}
        </a>
      </NoteLinkHoverCard>
    );
  }

  // Handle internal note links (/notes/ID format - from [#ID] conversion)
  const notePathMatch = href?.match(/^\/notes\/(\d+)$/);
  if (notePathMatch) {
    const noteId = parseInt(notePathMatch[1], 10);
    return (
      <NoteLinkHoverCard noteId={noteId}>
        <a href={href} className="note-link" {...props}>
          {children}
        </a>
      </NoteLinkHoverCard>
    );
  }

  // External links open in new tab
  const isExternal = href?.startsWith("http://") || href?.startsWith("https://");
  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  }

  return <a href={href} {...props}>{children}</a>;
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  // Extract note IDs from [#ID] patterns
  const noteIds = useMemo(() => extractNoteLinkIds(content), [content]);

  // Fetch titles for extracted note IDs
  const { titles, loading: titlesLoading } = useNoteTitles(noteIds);

  // Process content: replace [#ID] with [title](/notes/ID), then sanitize
  const processedContent = useMemo(() => {
    let processed = content;
    if (titles.size > 0) {
      processed = replaceNoteLinkPatterns(processed, titles);
    }
    return sanitizeContent(processed);
  }, [content, titles]);

  return (
    <div className={`markdown-content ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: CodeBlock as any,
          a: LinkComponent as any,
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
    </div>
  );
}
