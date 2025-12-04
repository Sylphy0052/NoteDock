import { Routes, Route } from 'react-router-dom'

// Placeholder pages - will be implemented later
const HomePage = () => <div>Home Page</div>
const NotesListPage = () => <div>Notes List</div>
const NoteDetailPage = () => <div>Note Detail</div>
const NoteEditPage = () => <div>Note Edit</div>
const TrashPage = () => <div>Trash</div>
const TagsPage = () => <div>Tags</div>
const LinkmapPage = () => <div>Link Map</div>

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/notes" element={<NotesListPage />} />
      <Route path="/notes/:id" element={<NoteDetailPage />} />
      <Route path="/notes/:id/edit" element={<NoteEditPage />} />
      <Route path="/notes/new" element={<NoteEditPage />} />
      <Route path="/trash" element={<TrashPage />} />
      <Route path="/tags" element={<TagsPage />} />
      <Route path="/linkmap" element={<LinkmapPage />} />
    </Routes>
  )
}
