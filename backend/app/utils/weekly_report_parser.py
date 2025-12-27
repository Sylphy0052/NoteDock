"""Weekly report parser utility.

Parses weekly report notes to extract project sections in the format:
## @P 会社名/プロジェクト名
- 作業内容
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional

from app.utils.markdown import extract_note_links


@dataclass
class ProjectSection:
    """A project section extracted from a weekly report."""

    company_name: str
    project_name: str
    content: str
    author: Optional[str] = None
    note_id: int = 0
    note_links: List[int] = field(default_factory=list)
    project_id: Optional[int] = None  # Direct project ID reference (e.g., @P1)


def parse_weekly_report(
    content: str,
    author: Optional[str] = None,
    note_id: int = 0,
) -> List[ProjectSection]:
    """Parse weekly report content to extract project sections.

    Expected formats:
        Format 1 (Full):
            ## @P 会社名/プロジェクト名
            - 作業内容1

        Format 2 (Short - Project ID):
            ## @P1
            - 作業内容1

    Args:
        content: The markdown content of the weekly report
        author: The author of the weekly report (usually created_by)
        note_id: The ID of the source note

    Returns:
        List of ProjectSection objects, one per project section found
    """
    sections: List[ProjectSection] = []

    # Pattern 1: ## @P 会社名/プロジェクト名 (full format)
    pattern_full = r"^##\s+@P\s+(.+?)/(.+?)\s*$"
    # Pattern 2: ## @P{ID} (short format with project ID)
    pattern_short = r"^##\s+@P(\d+)\s*$"

    lines = content.split("\n")
    current_section: Optional[ProjectSection] = None
    current_content: List[str] = []

    for line in lines:
        match_full = re.match(pattern_full, line)
        match_short = re.match(pattern_short, line)

        if match_full or match_short:
            # Save previous section if exists
            if current_section:
                current_section.content = "\n".join(current_content).strip()
                current_section.note_links = extract_note_links(
                    current_section.content
                )
                sections.append(current_section)

            if match_full:
                # Full format: ## @P 会社名/プロジェクト名
                company_name = match_full.group(1).strip()
                project_name = match_full.group(2).strip()
                current_section = ProjectSection(
                    company_name=company_name,
                    project_name=project_name,
                    content="",
                    author=author,
                    note_id=note_id,
                    note_links=[],
                    project_id=None,
                )
            else:
                # Short format: ## @P{ID}
                project_id = int(match_short.group(1))
                current_section = ProjectSection(
                    company_name="",
                    project_name="",
                    content="",
                    author=author,
                    note_id=note_id,
                    note_links=[],
                    project_id=project_id,
                )

            current_content = []
        elif current_section is not None:
            current_content.append(line)

    # Save last section
    if current_section:
        current_section.content = "\n".join(current_content).strip()
        current_section.note_links = extract_note_links(current_section.content)
        sections.append(current_section)

    return sections


def get_week_label_from_date(dt) -> str:
    """Generate a week label from a datetime.

    Format: YYYY年M月第N週 (e.g., 2025年1月第4週)
    """
    week_num = (dt.day - 1) // 7 + 1
    return f"{dt.year}年{dt.month}月第{week_num}週"
