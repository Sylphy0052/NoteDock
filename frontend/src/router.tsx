import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout'
import {
  HomePage,
  NotesListPage,
  NoteDetailPage,
  NoteEditPage,
  TrashPage,
  LinkmapPage,
  TagsPage,
  FoldersPage,
  FilesListPage,
  SettingsPage,
  TemplatesPage,
} from './pages'
import { DrawingPage } from './pages/DrawingPage'
import { DrawingsListPage } from './pages/DrawingsListPage'
import { DrawingTutorialPage } from './pages/DrawingTutorialPage'
import ProjectsPage from './pages/ProjectsPage'

export function AppRouter() {
  return (
    <Routes>
      {/* 独自レイアウトを持つページ */}
      <Route path="/drawing" element={<DrawingPage />} />
      <Route path="/drawing/:drawingId" element={<DrawingPage />} />
      <Route path="/drawings" element={<DrawingsListPage />} />
      <Route path="/drawings/tutorial" element={<DrawingTutorialPage />} />

      {/* 共通レイアウトを使用するページ */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/notes" element={<NotesListPage />} />
        <Route path="/notes/new" element={<NoteEditPage />} />
        <Route path="/notes/:noteId" element={<NoteDetailPage />} />
        <Route path="/notes/:noteId/edit" element={<NoteEditPage />} />
        <Route path="/folders" element={<FoldersPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/files" element={<FilesListPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/linkmap" element={<LinkmapPage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectsPage />} />
      </Route>
    </Routes>
  )
}
