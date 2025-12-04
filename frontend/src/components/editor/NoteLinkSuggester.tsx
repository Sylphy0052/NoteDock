import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Hash } from "lucide-react";
import { quickSearch } from "../../api/search";
import { getNotes } from "../../api/notes";
import type { NoteSummary } from "../../api/types";

interface NoteLinkSuggesterProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  onInsertLink: (noteId: number, noteTitle: string) => void;
}

interface SuggesterState {
  isOpen: boolean;
  query: string;
  startPosition: number;
  position: { top: number; left: number };
}

export function NoteLinkSuggester({
  textareaRef,
  content,
  onInsertLink,
}: NoteLinkSuggesterProps) {
  const [state, setState] = useState<SuggesterState>({
    isOpen: false,
    query: "",
    startPosition: 0,
    position: { top: 0, left: 0 },
  });
  const [suggestions, setSuggestions] = useState<NoteSummary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const suggesterRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Fetch suggestions based on query
  const fetchSuggestions = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      if (query.trim()) {
        // Use quick search for non-empty queries
        const results = await quickSearch(query);
        setSuggestions(results.slice(0, 10));
      } else {
        // Show recent notes when query is empty
        const { items } = await getNotes({ page_size: 10 });
        setSuggestions(items);
      }
    } catch (error) {
      console.error("Failed to fetch note suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!state.isOpen) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(state.query);
    }, 150);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [state.query, state.isOpen, fetchSuggestions]);

  // Calculate popup position based on cursor in textarea
  const calculatePosition = useCallback((textarea: HTMLTextAreaElement, cursorPos: number) => {
    const style = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(style.lineHeight) || 24;
    const paddingTop = parseFloat(style.paddingTop) || 16;
    const paddingLeft = parseFloat(style.paddingLeft) || 16;

    // Get text before cursor to calculate position
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split("\n");
    const currentLineIndex = lines.length - 1;
    const currentLineText = lines[currentLineIndex];

    // Estimate character width (monospace font)
    const charWidth = 9.6; // Approximate for monospace at 0.9375rem

    // Calculate position relative to textarea
    const top = paddingTop + (currentLineIndex * lineHeight) - textarea.scrollTop + lineHeight;
    const left = Math.min(
      paddingLeft + (currentLineText.length * charWidth),
      textarea.clientWidth - 320
    );

    return {
      top: Math.max(top, lineHeight + paddingTop),
      left: Math.max(left, paddingLeft),
    };
  }, []);

  // Handle textarea input to detect [# trigger
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.substring(0, cursorPos);

      // Check for [# pattern
      const triggerMatch = textBeforeCursor.match(/\[#([^\]\s]*)$/);

      if (triggerMatch) {
        const query = triggerMatch[1];
        const startPos = cursorPos - triggerMatch[0].length;
        const position = calculatePosition(textarea, cursorPos);

        setState({
          isOpen: true,
          query,
          startPosition: startPos,
          position,
        });
        setSelectedIndex(0);
      } else if (state.isOpen) {
        setState((prev) => ({ ...prev, isOpen: false }));
      }
    };

    // Attach to textarea's input event via content change
    handleInput();
  }, [content, textareaRef, calculatePosition, state.isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !state.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            handleSelect(suggestions[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setState((prev) => ({ ...prev, isOpen: false }));
          break;
      }
    };

    textarea.addEventListener("keydown", handleKeyDown);
    return () => textarea.removeEventListener("keydown", handleKeyDown);
  }, [state.isOpen, suggestions, selectedIndex, textareaRef]);

  // Handle selection
  const handleSelect = useCallback(
    (note: NoteSummary) => {
      onInsertLink(note.id, note.title);
      setState((prev) => ({ ...prev, isOpen: false }));
    },
    [onInsertLink]
  );

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggesterRef.current &&
        !suggesterRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setState((prev) => ({ ...prev, isOpen: false }));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [textareaRef]);

  // Scroll selected item into view
  useEffect(() => {
    if (!suggesterRef.current) return;
    const selectedItem = suggesterRef.current.querySelector(".selected");
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!state.isOpen) return null;

  return (
    <div
      ref={suggesterRef}
      className="note-link-suggester"
      style={{
        top: state.position.top,
        left: state.position.left,
      }}
    >
      <div className="suggester-header">
        <Hash size={14} />
        <span>ノートをリンク</span>
        {state.query && <span className="suggester-query">"{state.query}"</span>}
      </div>

      <div className="suggester-list">
        {isLoading ? (
          <div className="suggester-loading">
            <div className="spinner-small" />
            <span>検索中...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="suggester-empty">
            <span>ノートが見つかりません</span>
          </div>
        ) : (
          suggestions.map((note, index) => (
            <button
              key={note.id}
              className={`suggester-item ${index === selectedIndex ? "selected" : ""}`}
              onClick={() => handleSelect(note)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <FileText size={14} />
              <span className="suggester-item-title">{note.title}</span>
              <span className="suggester-item-id">#{note.id}</span>
            </button>
          ))
        )}
      </div>

      <div className="suggester-footer">
        <span>↑↓ 移動</span>
        <span>Enter 選択</span>
        <span>Esc 閉じる</span>
      </div>
    </div>
  );
}
