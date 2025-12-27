"""Tests for project link parsing in markdown utility."""
import pytest

from app.utils.markdown import extract_project_links, render_project_links


class TestExtractProjectLinks:
    """Tests for extract_project_links function."""

    def test_extract_single_project_link(self) -> None:
        """Test extracting a single @P<ID> reference."""
        content = "この案件は @P1 を参照してください"
        result = extract_project_links(content)
        assert result == [1]

    def test_extract_multiple_project_links(self) -> None:
        """Test extracting multiple @P<ID> references."""
        content = "@P1 と @P42 と @P123 を参照"
        result = extract_project_links(content)
        assert sorted(result) == [1, 42, 123]

    def test_extract_duplicate_project_links(self) -> None:
        """Test that duplicate links return unique IDs."""
        content = "@P1 と @P1 と @P2"
        result = extract_project_links(content)
        assert sorted(result) == [1, 2]

    def test_no_project_links(self) -> None:
        """Test content with no project links."""
        content = "プロジェクトリンクなし"
        result = extract_project_links(content)
        assert result == []

    def test_ignore_note_links(self) -> None:
        """Test that #<ID> note links are not captured."""
        content = "ノート #1 とプロジェクト @P2"
        result = extract_project_links(content)
        assert result == [2]

    def test_ignore_email_like_patterns(self) -> None:
        """Test that email-like patterns are not captured."""
        content = "user@P1domain.com には反応しない"
        result = extract_project_links(content)
        assert result == []

    def test_project_link_at_start(self) -> None:
        """Test project link at start of content."""
        content = "@P1 から始まる文"
        result = extract_project_links(content)
        assert result == [1]

    def test_project_link_at_end(self) -> None:
        """Test project link at end of content."""
        content = "文の終わりに @P99"
        result = extract_project_links(content)
        assert result == [99]

    def test_project_link_in_parentheses(self) -> None:
        """Test project link inside parentheses."""
        content = "詳細は (@P5) を参照"
        result = extract_project_links(content)
        assert result == [5]

    def test_empty_content(self) -> None:
        """Test empty content."""
        result = extract_project_links("")
        assert result == []

    def test_ignore_p_without_at(self) -> None:
        """Test that P<ID> without @ is not captured."""
        content = "P1 や P42 は対象外"
        result = extract_project_links(content)
        assert result == []


class TestRenderProjectLinks:
    """Tests for render_project_links function."""

    def test_render_existing_project_link(self) -> None:
        """Test rendering @P<ID> for existing project."""
        content = "詳細は @P1 を参照"
        existing_ids = {1, 2, 3}
        result = render_project_links(content, existing_ids)
        assert '<a href="/projects/1" data-project-id="1" class="project-link">@P1</a>' in result

    def test_render_nonexistent_project_link(self) -> None:
        """Test rendering @P<ID> for nonexistent project."""
        content = "詳細は @P999 を参照"
        existing_ids = {1, 2, 3}
        result = render_project_links(content, existing_ids)
        assert '<span class="project-link-invalid">@P999</span>' in result

    def test_render_multiple_project_links(self) -> None:
        """Test rendering multiple project links."""
        content = "@P1 と @P2 と @P999"
        existing_ids = {1, 2}
        result = render_project_links(content, existing_ids)
        assert '<a href="/projects/1" data-project-id="1" class="project-link">@P1</a>' in result
        assert '<a href="/projects/2" data-project-id="2" class="project-link">@P2</a>' in result
        assert '<span class="project-link-invalid">@P999</span>' in result

    def test_render_no_project_links(self) -> None:
        """Test content without project links is unchanged."""
        content = "プロジェクトリンクなし"
        existing_ids = {1}
        result = render_project_links(content, existing_ids)
        assert result == content

    def test_render_empty_existing_ids(self) -> None:
        """Test with empty existing_ids set."""
        content = "詳細は @P1 を参照"
        existing_ids: set[int] = set()
        result = render_project_links(content, existing_ids)
        assert '<span class="project-link-invalid">@P1</span>' in result

    def test_render_preserves_surrounding_text(self) -> None:
        """Test that surrounding text is preserved."""
        content = "開始 @P1 終了"
        existing_ids = {1}
        result = render_project_links(content, existing_ids)
        assert result.startswith("開始 ")
        assert result.endswith(" 終了")

    def test_render_coexists_with_note_links(self) -> None:
        """Test that note links are not affected."""
        content = "ノート #1 とプロジェクト @P2"
        existing_ids = {2}
        result = render_project_links(content, existing_ids)
        assert "#1" in result  # Note link preserved
        assert '<a href="/projects/2" data-project-id="2" class="project-link">@P2</a>' in result
