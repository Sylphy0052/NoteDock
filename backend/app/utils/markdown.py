import re
from typing import List, Tuple
from dataclasses import dataclass


@dataclass
class TocItem:
    """Table of contents item."""
    id: str
    text: str
    level: int = 2


@dataclass
class NoteLink:
    """Internal note link reference."""
    note_id: int
    start: int
    end: int


def extract_toc(content: str) -> List[TocItem]:
    """Extract h2 headings from markdown content for TOC.

    Only extracts ## level headings as per spec.
    """
    toc_items = []
    # Match ## headings (h2 only)
    pattern = r"^##\s+(.+)$"

    for match in re.finditer(pattern, content, re.MULTILINE):
        text = match.group(1).strip()
        # Generate ID from text (slugify)
        item_id = slugify(text)
        toc_items.append(TocItem(id=item_id, text=text, level=2))

    return toc_items


def slugify(text: str) -> str:
    """Convert text to URL-safe slug for heading IDs."""
    # Remove special characters, keep alphanumeric and spaces
    slug = re.sub(r"[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff-]", "", text)
    # Replace spaces with hyphens
    slug = re.sub(r"\s+", "-", slug)
    # Lowercase
    slug = slug.lower()
    return slug or "section"


def extract_note_links(content: str) -> List[int]:
    """Extract note IDs from #ID references in content.

    Pattern: #<number> (e.g., #1, #42, #123)
    """
    # Match #<number> pattern, not part of a heading
    pattern = r"(?<![#\w])#(\d+)(?!\d)"
    matches = re.findall(pattern, content)
    # Return unique note IDs
    return list(set(int(m) for m in matches))


def generate_summary(content: str, max_length: int = 200) -> str:
    """Generate a plain text summary from markdown content.

    Removes markdown formatting and returns first N characters.
    """
    # Remove code blocks
    text = re.sub(r"```[\s\S]*?```", "", content)
    text = re.sub(r"`[^`]+`", "", text)

    # Remove headings markers
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)

    # Remove bold/italic markers
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    text = re.sub(r"_([^_]+)_", r"\1", text)

    # Remove links but keep text
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)

    # Remove images
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", "", text)

    # Remove blockquotes markers
    text = re.sub(r"^>\s*", "", text, flags=re.MULTILINE)

    # Remove list markers
    text = re.sub(r"^[\s]*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[\s]*\d+\.\s+", "", text, flags=re.MULTILINE)

    # Remove horizontal rules
    text = re.sub(r"^[-*_]{3,}$", "", text, flags=re.MULTILINE)

    # Remove HTML tags (should be disabled, but just in case)
    text = re.sub(r"<[^>]+>", "", text)

    # Collapse multiple newlines/spaces
    text = re.sub(r"\n+", " ", text)
    text = re.sub(r"\s+", " ", text)

    # Trim and truncate
    text = text.strip()
    if len(text) > max_length:
        text = text[:max_length].rsplit(" ", 1)[0] + "..."

    return text


def render_note_links(content: str, existing_ids: set[int]) -> str:
    """Convert #ID references to clickable links.

    Only converts IDs that exist in existing_ids set.
    """
    def replace_link(match: re.Match) -> str:
        note_id = int(match.group(1))
        if note_id in existing_ids:
            return f'<a href="/notes/{note_id}" data-note-id="{note_id}">#{note_id}</a>'
        return match.group(0)

    pattern = r"(?<![#\w])#(\d+)(?!\d)"
    return re.sub(pattern, replace_link, content)


def add_heading_ids(content: str) -> str:
    """Add IDs to h2 headings for TOC navigation."""
    def replace_heading(match: re.Match) -> str:
        text = match.group(1).strip()
        heading_id = slugify(text)
        return f'<h2 id="{heading_id}">{text}</h2>'

    # This is meant to be used after markdown rendering
    pattern = r"<h2>([^<]+)</h2>"
    return re.sub(pattern, replace_heading, content)


def extract_project_links(content: str) -> List[int]:
    """Extract project IDs from @P<ID> references in content.

    Pattern: @P<number> (e.g., @P1, @P42)
    The pattern requires @ to not be preceded by alphanumeric characters
    to avoid matching email-like patterns.
    """
    # Match @P<number> pattern, not part of an email or word
    pattern = r"(?<![a-zA-Z0-9_])@P(\d+)(?!\d)"
    matches = re.findall(pattern, content)
    # Return unique project IDs
    return list(set(int(m) for m in matches))


def render_project_links(content: str, existing_ids: set[int]) -> str:
    """Convert @P<ID> references to clickable links.

    Existing projects get clickable links, nonexistent ones get invalid styling.
    """
    def replace_link(match: re.Match) -> str:
        project_id = int(match.group(1))
        if project_id in existing_ids:
            return (
                f'<a href="/projects/{project_id}" '
                f'data-project-id="{project_id}" '
                f'class="project-link">@P{project_id}</a>'
            )
        return f'<span class="project-link-invalid">@P{project_id}</span>'

    pattern = r"(?<![a-zA-Z0-9_])@P(\d+)(?!\d)"
    return re.sub(pattern, replace_link, content)
