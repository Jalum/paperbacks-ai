'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/lib/store';
import { fetchProjects, fetchProject } from '@/lib/projectApi';
import { Project } from '@/lib/projectApi';

export default function ProjectControls() {
  const { 
    currentProjectId, 
    isProjectSaved, 
    isSaving, 
    lastSavedAt,
    saveProject,
    loadProject,
    createNewProject 
  } = useProjectStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);

  const handleSave = async () => {
    try {
      await saveProject();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save project. Please try again.');
    }
  };

  const handleLoadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetchProjects(10, 0);
      setProjects(response.projects);
      setShowProjectList(true);
    } catch (error) {
      console.error('Failed to load projects:', error);
      alert('Failed to load projects. Please try again.');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleLoadProject = async (projectId: string) => {
    try {
      const project = await fetchProject(projectId);
      loadProject(project);
      setShowProjectList(false);
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project. Please try again.');
    }
  };

  const handleNewProject = () => {
    if (!isProjectSaved) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to create a new project?');
      if (!confirmed) return;
    }
    createNewProject();
    setShowProjectList(false);
  };

  return (
    <div className="p-4 border border-gray-300 rounded-md space-y-4">
      <h3 className="text-lg font-semibold">Project Controls</h3>
      
      {/* Save Status */}
      <div className="text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isProjectSaved ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span>{isProjectSaved ? 'Saved' : 'Unsaved changes'}</span>
        </div>
        {lastSavedAt && (
          <div className="text-gray-500 text-xs mt-1">
            Last saved: {lastSavedAt.toLocaleTimeString()}
          </div>
        )}
        {currentProjectId && (
          <div className="text-gray-500 text-xs mt-1">
            Project ID: {currentProjectId.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Project'}
        </button>

        <button
          onClick={handleLoadProjects}
          disabled={isLoadingProjects}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
        >
          {isLoadingProjects ? 'Loading...' : 'Load Project'}
        </button>

        <button
          onClick={handleNewProject}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          New Project
        </button>
      </div>

      {/* Project List Modal */}
      {showProjectList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">Load Project</h4>
              <button
                onClick={() => setShowProjectList(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {projects.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No projects found</p>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleLoadProject(project.id)}
                    className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <div className="font-medium">{project.name}</div>
                    <div className="text-sm text-gray-500">
                      {project.bookData.title} by {project.bookData.author}
                    </div>
                    <div className="text-xs text-gray-400">
                      Updated: {new Date(project.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}