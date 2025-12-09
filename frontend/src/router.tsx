import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout";
import {
  HomePage,
  NotesListPage,
  NoteDetailPage,
  NoteEditPage,
  TrashPage,
  LinkmapPage,
  TagsPage,
  FoldersPage,
} from "./pages";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/notes" element={<NotesListPage />} />
        <Route path="/notes/new" element={<NoteEditPage />} />
        <Route path="/notes/:noteId" element={<NoteDetailPage />} />
        <Route path="/notes/:noteId/edit" element={<NoteEditPage />} />
        <Route path="/folders" element={<FoldersPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/linkmap" element={<LinkmapPage />} />
        <Route path="/tags" element={<TagsPage />} />
      </Route>
    </Routes>
  );
}
