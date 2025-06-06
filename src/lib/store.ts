import { create } from 'zustand';
import { Project, BookDetails, DesignData } from '@/types';
import { calculateSpineWidth } from '@/lib/utils';
import { Project as ApiProject, autoSaveProject } from '@/lib/projectApi';
import { analytics } from '@/lib/analytics';

interface ProjectState extends Project {
  // Current project metadata
  currentProjectId: string | null;
  isProjectSaved: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  
  // Actions
  setBookDetails: (details: Partial<BookDetails>) => void;
  setDesignData: (design: Partial<DesignData>) => void;
  setCoverImage: (image: string) => void;
  getCalculatedSpineWidth: () => number;
  
  // Project management actions
  loadProject: (project: ApiProject) => void;
  saveProject: () => Promise<void>;
  createNewProject: () => void;
  markAsUnsaved: () => void;
}

const initialBookDetails: BookDetails = {
  title: 'Untitled Book',
  author: 'Unknown Author',
  pageCount: 100,
  trimSize: '6x9', // Default trim size
  paperType: 'white', // Default paper type
};

const initialDesignData: DesignData = {
  spineText: '',
  spineFont: 'Arial, sans-serif',
  spineFontSize: 12,
  spineColor: '#000000',
  spineBackgroundColor: '#FFFFFF',
  backCoverBackgroundColor: '#FFFFFF',
  backCoverText: '',
  backCoverFont: 'Arial, sans-serif',
  backCoverFontSize: 10,
  backCoverTextColor: '#000000',
  backCoverAIPrompt: '',
  backCoverAIImageURL: '',
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  id: new Date().toISOString(), // Simple unique ID for now
  bookDetails: initialBookDetails,
  designData: initialDesignData,
  coverImage: undefined,
  aiGeneratedElements: [],

  // Project metadata
  currentProjectId: null,
  isProjectSaved: true, // Start as saved since it's a new project
  isSaving: false,
  lastSavedAt: null,

  setBookDetails: (details) => {
    set((state) => ({
      bookDetails: { ...state.bookDetails, ...details },
      isProjectSaved: false, // Mark as unsaved when data changes
    }));
  },

  setDesignData: (design) => {
    set((state) => ({
      designData: { ...state.designData, ...design },
      isProjectSaved: false, // Mark as unsaved when data changes
    }));
  },

  setCoverImage: (image) => {
    set({ 
      coverImage: image,
      isProjectSaved: false, // Mark as unsaved when data changes
    });
  },

  getCalculatedSpineWidth: () => {
    const { pageCount, paperType } = get().bookDetails;
    return calculateSpineWidth(pageCount, paperType);
  },

  // Project management actions
  loadProject: (project: ApiProject) => {
    set({
      currentProjectId: project.id,
      bookDetails: project.bookData,
      designData: project.designData,
      coverImage: project.coverImageUrl || undefined,
      isProjectSaved: true,
      lastSavedAt: new Date(project.updatedAt),
    });
    
    // Track project load
    analytics.trackProjectAction('project_loaded', project.id);
  },

  saveProject: async () => {
    const state = get();
    
    if (state.isSaving) return; // Prevent multiple saves
    
    set({ isSaving: true });
    
    try {
      // Cover image is now always a string (blob URL or empty)
      const coverImageUrl = state.coverImage || undefined;
      const aiBackImageUrl = state.designData.backCoverAIImageURL;

      const savedProject = await autoSaveProject(
        state.currentProjectId,
        state.bookDetails,
        state.designData,
        coverImageUrl,
        aiBackImageUrl
      );

      set({
        currentProjectId: savedProject.id,
        isProjectSaved: true,
        lastSavedAt: new Date(),
        isSaving: false,
      });

      console.log('Project saved successfully:', savedProject.id);
      
      // Track project save
      analytics.trackProjectAction('project_saved', savedProject.id);
    } catch (error) {
      console.error('Failed to save project:', error);
      analytics.trackError(`Project save failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'project_save');
      set({ isSaving: false });
      throw error;
    }
  },

  createNewProject: () => {
    set({
      id: new Date().toISOString(),
      currentProjectId: null,
      bookDetails: initialBookDetails,
      designData: initialDesignData,
      coverImage: undefined,
      aiGeneratedElements: [],
      isProjectSaved: true,
      lastSavedAt: null,
    });
    
    // Track new project creation
    analytics.trackProjectAction('project_created');
  },

  markAsUnsaved: () => {
    set({ isProjectSaved: false });
  },
})); 