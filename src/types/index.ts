export interface BookDetails {
  title: string;
  author: string;
  pageCount: number;
  trimSize: string; // e.g., "6x9", "5.5x8.5"
  paperType: string; // e.g., "cream", "white"
}

export interface DesignData {
  spineText: string;
  spineFont: string;
  spineFontSize: number;
  spineColor: string;
  spineBackgroundColor: string;
  spineBackgroundType?: 'flat' | 'gradient'; // Defaults to 'flat'
  spineGradientStartColor?: string;
  spineGradientEndColor?: string;
  spineGradientDirection?: 'vertical' | 'horizontal'; // Defaults to 'vertical'
  backCoverBackgroundColor: string;
  backCoverBackgroundType?: 'flat' | 'gradient' | 'pattern' | 'ai'; // Defaults to 'flat'
  backCoverGradientStartColor?: string;
  backCoverGradientEndColor?: string;
  backCoverGradientDirection?: 'vertical' | 'horizontal'; // Defaults to 'vertical'
  backCoverPatternType?: 'stripes' | 'dots' | 'checkerboard' | 'diagonal' | 'grid' | 'circles' | 'triangles' | 'hexagons' | 'waves' | 'diamonds';
  backCoverPatternColor1?: string;
  backCoverPatternColor2?: string;
  backCoverPatternScale?: number; // e.g. size of pattern elements in px
  backCoverPatternDirection?: 'vertical' | 'horizontal'; // For stripes

  backCoverAIPrompt?: string; // User prompt for AI image generation
  backCoverAIImageURL?: string; // URL of the AI-generated image for the back cover

  backCoverBlurbEnableBox?: boolean;
  backCoverBlurbBoxFillColor?: string;
  backCoverBlurbBoxCornerRadius?: number;
  backCoverBlurbBoxPadding?: number; // Inner padding for text
  backCoverBlurbBoxXOffsetPercent?: number; // Position from top-left of back cover trim (deprecated)
  backCoverBlurbBoxYOffsetPercent?: number;
  backCoverBlurbBoxWidthPercent?: number;   // Size as % of back cover trim (deprecated)
  backCoverBlurbBoxHeightPercent?: number;
  backCoverBlurbBoxLeftMarginPercent?: number; // Left/right margin as % of back cover width
  backCoverBlurbBoxOpacity?: number; // 0-1

  backCoverText: string;
  backCoverFont?: string;
  backCoverFontSize?: number;
  backCoverTextColor?: string;
  backCoverTextAlign?: 'left' | 'center' | 'right' | 'justify'; // Text alignment for back cover blurb
  // ... more design properties
}

export interface Project {
  id: string;
  bookDetails: BookDetails;
  designData: DesignData;
  coverImage?: string; // Always a URL string (blob URL or base64 URL)
  aiGeneratedElements: unknown[]; // Changed from any[] to unknown[]
} 