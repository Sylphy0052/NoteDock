import { useState } from 'react'
import {
  Building2,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
} from 'lucide-react'
import { useCompanies, useProjects, useDeleteCompany, useDeleteProject } from '../../hooks'
import type { Company, Project } from '../../api/types'

interface ProjectTreeProps {
  selectedProjectId?: number | null
  onSelectProject?: (project: Project | null) => void
  onCreateCompany?: () => void
  onEditCompany?: (company: Company) => void
  onCreateProject?: (companyId?: number | null) => void
  onEditProject?: (project: Project) => void
}

export function ProjectTree({
  selectedProjectId,
  onSelectProject,
  onCreateCompany,
  onEditCompany,
  onCreateProject,
  onEditProject,
}: ProjectTreeProps) {
  const [expandedCompanies, setExpandedCompanies] = useState<Set<number>>(new Set())
  const [showUnassigned, setShowUnassigned] = useState(true)
  const [contextMenu, setContextMenu] = useState<{
    type: 'company' | 'project'
    id: number
    x: number
    y: number
  } | null>(null)

  const { data: companiesData, isLoading: loadingCompanies } = useCompanies({ page_size: 100 })
  const { data: projectsData, isLoading: loadingProjects } = useProjects({ page_size: 100 })
  const deleteCompany = useDeleteCompany()
  const deleteProject = useDeleteProject()

  const companies = companiesData?.items ?? []
  const projects = projectsData?.items ?? []

  const unassignedProjects = projects.filter((p) => !p.company_id)
  const getProjectsForCompany = (companyId: number) =>
    projects.filter((p) => p.company_id === companyId)

  const toggleCompany = (companyId: number) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev)
      if (next.has(companyId)) {
        next.delete(companyId)
      } else {
        next.add(companyId)
      }
      return next
    })
  }

  const handleContextMenu = (
    e: React.MouseEvent,
    type: 'company' | 'project',
    id: number
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ type, id, x: e.clientX, y: e.clientY })
  }

  const closeContextMenu = () => setContextMenu(null)

  const handleDeleteCompany = async (companyId: number) => {
    if (window.confirm('この会社を削除しますか？関連するプロジェクトは会社との紐付けが解除されます。')) {
      try {
        await deleteCompany.mutateAsync(companyId)
      } catch (err) {
        console.error('Failed to delete company:', err)
      }
    }
    closeContextMenu()
  }

  const handleDeleteProject = async (projectId: number) => {
    if (window.confirm('このプロジェクトを削除しますか？関連するノートはプロジェクトとの紐付けが解除されます。')) {
      try {
        await deleteProject.mutateAsync(projectId)
        if (selectedProjectId === projectId) {
          onSelectProject?.(null)
        }
      } catch (err) {
        console.error('Failed to delete project:', err)
      }
    }
    closeContextMenu()
  }

  const renderProject = (project: Project) => (
    <div
      key={project.id}
      className={`project-tree-item project-item ${selectedProjectId === project.id ? 'selected' : ''}`}
      onClick={() => onSelectProject?.(project)}
      onContextMenu={(e) => handleContextMenu(e, 'project', project.id)}
    >
      <Briefcase size={16} />
      <span className="project-name">{project.name}</span>
      <span className="project-note-count">{project.note_count}</span>
      <button
        className="btn btn-icon btn-sm project-menu-btn"
        onClick={(e) => {
          e.stopPropagation()
          handleContextMenu(e, 'project', project.id)
        }}
      >
        <MoreHorizontal size={14} />
      </button>
    </div>
  )

  if (loadingCompanies || loadingProjects) {
    return <div className="project-tree loading">読み込み中...</div>
  }

  return (
    <div className="project-tree" onClick={closeContextMenu}>
      <div className="project-tree-header">
        <h3>プロジェクト</h3>
        <div className="project-tree-actions">
          <button
            className="btn btn-icon btn-sm"
            onClick={onCreateCompany}
            title="会社を追加"
          >
            <Building2 size={16} />
            <Plus size={12} className="icon-overlay" />
          </button>
          <button
            className="btn btn-icon btn-sm"
            onClick={() => onCreateProject?.()}
            title="プロジェクトを追加"
          >
            <Briefcase size={16} />
            <Plus size={12} className="icon-overlay" />
          </button>
        </div>
      </div>

      <div className="project-tree-content">
        {/* Companies with projects */}
        {companies.map((company) => {
          const companyProjects = getProjectsForCompany(company.id)
          const isExpanded = expandedCompanies.has(company.id)

          return (
            <div key={company.id} className="project-tree-company">
              <div
                className="project-tree-item company-item"
                onClick={() => toggleCompany(company.id)}
                onContextMenu={(e) => handleContextMenu(e, 'company', company.id)}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Building2 size={16} />
                <span className="company-name">{company.name}</span>
                <span className="company-project-count">{company.project_count}</span>
                <button
                  className="btn btn-icon btn-sm company-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleContextMenu(e, 'company', company.id)
                  }}
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>

              {isExpanded && (
                <div className="project-tree-children">
                  {companyProjects.map(renderProject)}
                  {companyProjects.length === 0 && (
                    <div className="project-tree-empty">プロジェクトなし</div>
                  )}
                  <button
                    className="btn btn-text btn-sm add-project-btn"
                    onClick={() => onCreateProject?.(company.id)}
                  >
                    <Plus size={14} />
                    プロジェクトを追加
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Unassigned projects */}
        {unassignedProjects.length > 0 && (
          <div className="project-tree-unassigned">
            <div
              className="project-tree-item unassigned-header"
              onClick={() => setShowUnassigned(!showUnassigned)}
            >
              {showUnassigned ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="unassigned-label">会社未設定</span>
              <span className="unassigned-count">{unassignedProjects.length}</span>
            </div>

            {showUnassigned && (
              <div className="project-tree-children">
                {unassignedProjects.map(renderProject)}
              </div>
            )}
          </div>
        )}

        {companies.length === 0 && projects.length === 0 && (
          <div className="project-tree-empty-state">
            <p>プロジェクトがありません</p>
            <button className="btn btn-primary btn-sm" onClick={() => onCreateProject?.()}>
              <Plus size={16} />
              プロジェクトを作成
            </button>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'company' && (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  const company = companies.find((c) => c.id === contextMenu.id)
                  if (company) onEditCompany?.(company)
                  closeContextMenu()
                }}
              >
                <Edit2 size={14} />
                編集
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  onCreateProject?.(contextMenu.id)
                  closeContextMenu()
                }}
              >
                <Plus size={14} />
                プロジェクトを追加
              </button>
              <button
                className="context-menu-item danger"
                onClick={() => handleDeleteCompany(contextMenu.id)}
              >
                <Trash2 size={14} />
                削除
              </button>
            </>
          )}
          {contextMenu.type === 'project' && (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  const project = projects.find((p) => p.id === contextMenu.id)
                  if (project) onEditProject?.(project)
                  closeContextMenu()
                }}
              >
                <Edit2 size={14} />
                編集
              </button>
              <button
                className="context-menu-item danger"
                onClick={() => handleDeleteProject(contextMenu.id)}
              >
                <Trash2 size={14} />
                削除
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
