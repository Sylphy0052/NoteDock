import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import mermaid from "mermaid";

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

// Custom link component to open external links in new tab
function LinkComponent({
  href,
  children,
  ...props
}: {
  href?: string;
  children: React.ReactNode;
}) {
  // Handle internal note links (#123)
  if (href?.startsWith("#") && /^#\d+$/.test(href)) {
    const noteId = href.slice(1);
    return (
      <a href={`/notes/${noteId}`} className="note-link" {...props}>
        {children}
      </a>
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
  // Sanitize content before rendering
  const sanitizedContent = sanitizeContent(content);

  return (
    <div className={`markdown-content ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: CodeBlock as any,
          a: LinkComponent as any,
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
}
