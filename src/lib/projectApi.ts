import { BookDetails, DesignData } from '@/types'

export interface Project {
  id: string
  name: string
  bookData: BookDetails
  designData: DesignData
  coverImageUrl?: string | null
  aiBackImageUrl?: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
}

export interface ProjectsResponse {
  projects: Project[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface CreateProjectData {
  name?: string
  bookData: BookDetails
  designData: DesignData
  coverImageUrl?: string
  aiBackImageUrl?: string
}

export interface UpdateProjectData {
  name?: string
  bookData?: BookDetails
  designData?: DesignData
  coverImageUrl?: string
  aiBackImageUrl?: string
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

class ProjectApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'ProjectApiError'
  }
}

// Fetch all projects
export async function fetchProjects(limit = 20, offset = 0): Promise<ProjectsResponse> {
  const response = await fetch(`/api/projects?limit=${limit}&offset=${offset}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new ProjectApiError(error.error || 'Failed to fetch projects', response.status)
  }
  
  return response.json()
}

// Fetch a specific project
export async function fetchProject(id: string): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new ProjectApiError(error.error || 'Failed to fetch project', response.status)
  }
  
  return response.json()
}

// Create a new project
export async function createProject(data: CreateProjectData): Promise<Project> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new ProjectApiError(error.error || 'Failed to create project', response.status)
  }
  
  return response.json()
}

// Update a project
export async function updateProject(id: string, data: UpdateProjectData): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new ProjectApiError(error.error || 'Failed to update project', response.status)
  }
  
  return response.json()
}

// Delete a project
export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new ProjectApiError(error.error || 'Failed to delete project', response.status)
  }
}

// Auto-save helper function
export async function autoSaveProject(
  projectId: string | null,
  bookData: BookDetails,
  designData: DesignData,
  coverImageUrl?: string,
  aiBackImageUrl?: string
): Promise<Project> {
  if (projectId) {
    // Update existing project
    return updateProject(projectId, {
      bookData,
      designData,
      coverImageUrl,
      aiBackImageUrl,
    })
  } else {
    // Create new project
    return createProject({
      name: bookData.title || 'Untitled Project',
      bookData,
      designData,
      coverImageUrl,
      aiBackImageUrl,
    })
  }
}