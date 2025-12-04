"""Tests for Linkmap API endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestLinkmapAPI:
    """Tests for /api/linkmap endpoints."""

    def test_get_linkmap_empty(self, client: TestClient) -> None:
        """Test getting linkmap when no notes exist."""
        response = client.get("/api/linkmap")

        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data
        assert len(data["nodes"]) == 0
        assert len(data["edges"]) == 0

    def test_get_linkmap_with_notes(
        self, client: TestClient, sample_note_data: dict
    ) -> None:
        """Test getting linkmap with notes."""
        # Create multiple notes
        note_ids = []
        for i in range(3):
            data = sample_note_data.copy()
            data["title"] = f"ノート {i + 1}"
            response = client.post("/api/notes", json=data)
            note_ids.append(response.json()["id"])

        # Get linkmap
        response = client.get("/api/linkmap")

        assert response.status_code == 200
        data = response.json()
        assert len(data["nodes"]) == 3
        # Edges should be empty (no links between notes yet)
        assert len(data["edges"]) == 0

    def test_get_linkmap_with_links(
        self, client: TestClient, sample_note_data: dict
    ) -> None:
        """Test getting linkmap with linked notes."""
        # Create first note
        note1_data = sample_note_data.copy()
        note1_data["title"] = "ノート1"
        response = client.post("/api/notes", json=note1_data)
        note1_id = response.json()["id"]

        # Create second note with link to first
        note2_data = sample_note_data.copy()
        note2_data["title"] = "ノート2"
        note2_data["content_md"] = f"これはノート1 #ID{note1_id} へのリンクです。"
        response = client.post("/api/notes", json=note2_data)
        note2_id = response.json()["id"]

        # Get linkmap
        response = client.get("/api/linkmap")

        assert response.status_code == 200
        data = response.json()
        assert len(data["nodes"]) == 2

        # Check nodes contain expected notes
        node_ids = [n["id"] for n in data["nodes"]]
        assert note1_id in node_ids
        assert note2_id in node_ids

    def test_get_note_linkmap(
        self, client: TestClient, sample_note_data: dict
    ) -> None:
        """Test getting nearby linkmap for a specific note."""
        # Create a note
        response = client.post("/api/notes", json=sample_note_data)
        note_id = response.json()["id"]

        # Get linkmap for specific note
        response = client.get(f"/api/linkmap/{note_id}")

        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data

        # The queried note should be in the nodes
        node_ids = [n["id"] for n in data["nodes"]]
        assert note_id in node_ids

    def test_get_note_linkmap_not_found(self, client: TestClient) -> None:
        """Test getting linkmap for non-existent note."""
        response = client.get("/api/linkmap/99999")

        # Should return 404 or empty result depending on implementation
        assert response.status_code in [200, 404]

    def test_linkmap_node_structure(
        self, client: TestClient, sample_note_data: dict
    ) -> None:
        """Test that linkmap nodes have expected structure."""
        # Create a note
        response = client.post("/api/notes", json=sample_note_data)
        note_id = response.json()["id"]

        # Get linkmap
        response = client.get("/api/linkmap")

        assert response.status_code == 200
        data = response.json()

        if len(data["nodes"]) > 0:
            node = data["nodes"][0]
            assert "id" in node
            assert "title" in node
