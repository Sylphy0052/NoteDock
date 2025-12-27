import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, Briefcase, FileText, MessageCircle } from 'lucide-react'
import { ProjectTree } from '../components/projects/ProjectTree'
import { ProjectNoteList } from '../components/projects/ProjectNoteList'
import { CompanyFormModal } from '../components/projects/CompanyFormModal'
import { ProjectFormModal } from '../components/projects/ProjectFormModal'
import { AIProjectAskPanel } from '../components/ai'
import { checkAIStatus } from '../api/ai'
import { getProject } from '../api/projects'
import type { Company, Project } from '../api/types'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()

  // Selected project
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Fetch project from URL parameter
  const { data: urlProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(parseInt(projectId!, 10)),
    enabled: !!projectId,
  })

  // Set selected project from URL parameter
  useEffect(() => {
    if (urlProject) {
      setSelectedProject(urlProject)
    }
  }, [urlProject])

  // AI panel state
  const [isAskPanelOpen, setIsAskPanelOpen] = useState(false)

  // Check AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: checkAIStatus,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })

  const isAIEnabled = aiStatus?.enabled ?? false

  // Modal states
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [defaultCompanyId, setDefaultCompanyId] = useState<number | null>(null)

  const handleCreateCompany = () => {
    setEditingCompany(null)
    setShowCompanyModal(true)
  }

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company)
    setShowCompanyModal(true)
  }

  const handleCreateProject = (companyId?: number | null) => {
    setEditingProject(null)
    setDefaultCompanyId(companyId ?? null)
    setShowProjectModal(true)
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setDefaultCompanyId(null)
    setShowProjectModal(true)
  }

  const handleCreateNote = () => {
    if (selectedProject) {
      navigate(`/notes/new?project_id=${selectedProject.id}`)
    } else {
      navigate('/notes/new')
    }
  }

  return (
    <div className="projects-page">
      <div className="projects-sidebar">
        <ProjectTree
          selectedProjectId={selectedProject?.id}
          onSelectProject={setSelectedProject}
          onCreateCompany={handleCreateCompany}
          onEditCompany={handleEditCompany}
          onCreateProject={handleCreateProject}
          onEditProject={handleEditProject}
        />
      </div>

      <div className="projects-main">
        {selectedProject ? (
          <>
            <header className="projects-header">
              <div className="project-info">
                <h1>
                  <Briefcase size={24} />
                  {selectedProject.name}
                </h1>
                {selectedProject.company && (
                  <div className="project-company">
                    <Building2 size={16} />
                    {selectedProject.company.name}
                  </div>
                )}
              </div>
              <div className="project-stats">
                <div className="stat">
                  <FileText size={16} />
                  <span>{selectedProject.note_count} ノート</span>
                </div>
              </div>
              {isAIEnabled && (
                <div className="project-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setIsAskPanelOpen(true)}
                    title="プロジェクトについて質問"
                  >
                    <MessageCircle size={16} />
                    AIに質問
                  </button>
                </div>
              )}
            </header>

            <ProjectNoteList
              project={selectedProject}
              onCreateNote={handleCreateNote}
            />
          </>
        ) : (
          <div className="projects-empty-state">
            <Briefcase size={48} />
            <h2>プロジェクトを選択</h2>
            <p>左のツリーからプロジェクトを選択してください</p>
            <div className="empty-actions">
              <button className="btn btn-primary" onClick={() => handleCreateProject()}>
                <Briefcase size={16} />
                プロジェクトを作成
              </button>
              <button className="btn btn-secondary" onClick={handleCreateCompany}>
                <Building2 size={16} />
                会社を作成
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Company Form Modal */}
      <CompanyFormModal
        isOpen={showCompanyModal}
        onClose={() => {
          setShowCompanyModal(false)
          setEditingCompany(null)
        }}
        company={editingCompany}
      />

      {/* Project Form Modal */}
      <ProjectFormModal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false)
          setEditingProject(null)
          setDefaultCompanyId(null)
        }}
        project={editingProject}
        defaultCompanyId={defaultCompanyId}
        onSuccess={() => {
          // Refresh selected project if it was edited
          if (editingProject && selectedProject?.id === editingProject.id) {
            setSelectedProject(null)
          }
        }}
      />

      {/* AI Ask Panel */}
      {selectedProject && (
        <AIProjectAskPanel
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          isOpen={isAskPanelOpen}
          onClose={() => setIsAskPanelOpen(false)}
        />
      )}
    </div>
  )
}
