'use client';

import React, { useState, ChangeEvent, useMemo, useEffect } from 'react';
import { useProjectStore } from '@/lib/store';
import { DesignData } from '@/types';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { analytics } from '@/lib/analytics';

import { fontOptions } from '@/lib/fonts';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Temporary placement for these constants, consider moving to utils/constants
const RENDER_PPI = 72; // Matching CoverPreview.tsx for now
const inchToPx = (inches: number) => inches * RENDER_PPI;

// Barcode area constants (matching CoverPreview.tsx)
const BARCODE_AREA_WIDTH_INCHES = 2.0;
const BARCODE_AREA_HEIGHT_INCHES = 1.2;
const BARCODE_MARGIN_FROM_TRIM_EDGE_INCHES = 0.25;

export default function BackCoverControls() {
  const { designData, setDesignData, bookDetails } = useProjectStore();
  const { data: session } = useSession();
  
  // Local state for inputs that need validation to prevent clamping while typing
  const [localHeightPercent, setLocalHeightPercent] = useState<string>('');
  const [localYOffsetPercent, setLocalYOffsetPercent] = useState<string>('');
  
  // State for the AI prompt generation process
  const [aiPromptInputs, setAiPromptInputs] = useState({
    motifs: '',
    elements: '',
    setting: '',
    style: '',
    colors: '',
  });
  const [suggestedDallePrompt, setSuggestedDallePrompt] = useState('');
  const [isSuggestingPrompt, setIsSuggestingPrompt] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const targetDimensions = useMemo(() => {
    const parts = bookDetails.trimSize.split('x').map(Number);
    const trimWidthInches = parts[0] || 6;
    const trimHeightInches = parts[1] || 9;
    // For back cover, dimensions are same as front cover trim
    return {
      widthPx: inchToPx(trimWidthInches),
      heightPx: inchToPx(trimHeightInches),
      trimWidthInches,
      trimHeightInches,
    };
  }, [bookDetails.trimSize]);

  // Calculate barcode safety zone constraints (Y-axis only)
  const barcodeConstraints = useMemo(() => {
    const barcodeWidthPercent = (BARCODE_AREA_WIDTH_INCHES / targetDimensions.trimWidthInches) * 100;
    const barcodeHeightPercent = (BARCODE_AREA_HEIGHT_INCHES / targetDimensions.trimHeightInches) * 100;
    const barcodeMarginPercentY = (BARCODE_MARGIN_FROM_TRIM_EDGE_INCHES / targetDimensions.trimHeightInches) * 100;
    
    // Barcode area top boundary (where barcode area starts vertically)
    const barcodeTopBoundaryPercent = 100 - barcodeMarginPercentY - barcodeHeightPercent;
    
    // Add 10% safety buffer above the barcode area
    const safetyBufferPercent = 10;
    const maxSafeVerticalPercent = barcodeTopBoundaryPercent - safetyBufferPercent;
    
    // Function to check if blurb box extends too far down (Y-axis only)
    const wouldExtendIntoSafetyZone = (heightPercent: number, yOffsetPercent: number) => {
      // Calculate box center Y position and bottom boundary
      const boxCenterYPercent = 50 + (50 * yOffsetPercent / 100);
      const boxBottomPercent = boxCenterYPercent + heightPercent / 2;
      
      // Only check if bottom extends too far down - top can extend anywhere
      return boxBottomPercent > maxSafeVerticalPercent;
    };
    
    return {
      barcodeWidthPercent: Math.round(barcodeWidthPercent),
      barcodeHeightPercent: Math.round(barcodeHeightPercent),
      barcodeTopBoundaryPercent: Math.round(barcodeTopBoundaryPercent),
      maxSafeVerticalPercent: Math.round(maxSafeVerticalPercent),
      safetyBufferPercent,
      wouldExtendIntoSafetyZone,
    };
  }, [targetDimensions]);

  // Sync local state with store values when they change externally
  useEffect(() => {
    setLocalHeightPercent((designData.backCoverBlurbBoxHeightPercent || 30).toString());
    setLocalYOffsetPercent((designData.backCoverBlurbBoxYOffsetPercent || 10).toString());
  }, [designData.backCoverBlurbBoxHeightPercent, designData.backCoverBlurbBoxYOffsetPercent, bookDetails.trimSize]);

  const handleAIInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAiPromptInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle special percentage inputs with local state to prevent clamping while typing
    if (name === 'backCoverBlurbBoxHeightPercent') {
      setLocalHeightPercent(value);
      return;
    }
    if (name === 'backCoverBlurbBoxYOffsetPercent') {
      setLocalYOffsetPercent(value);
      return;
    }
    
    // Handle all other inputs normally
    let processedValue: string | number = value;
    if (type === 'number') {
      processedValue = parseFloat(value);
    }

    setDesignData({ [name]: processedValue } as Partial<DesignData>);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = parseFloat(value);

    // Only validate Y-axis constraints for blurb box height and Y offset when focus is lost
    if (name === 'backCoverBlurbBoxHeightPercent' || name === 'backCoverBlurbBoxYOffsetPercent') {
      // Use local state values for accurate calculation
      const currentHeight = name === 'backCoverBlurbBoxHeightPercent' ? processedValue : parseFloat(localHeightPercent);
      const currentYOffset = name === 'backCoverBlurbBoxYOffsetPercent' ? processedValue : parseFloat(localYOffsetPercent);
      
      const proposedHeight = name === 'backCoverBlurbBoxHeightPercent' ? processedValue : currentHeight;
      const proposedYOffset = name === 'backCoverBlurbBoxYOffsetPercent' ? processedValue : currentYOffset;
      
      // Check if this would extend into the safety zone
      if (barcodeConstraints.wouldExtendIntoSafetyZone(proposedHeight, proposedYOffset)) {
        // Find a safe value by reducing the proposed value
        if (name === 'backCoverBlurbBoxHeightPercent') {
          // Reduce height until safe
          for (let testHeight = processedValue; testHeight >= 10; testHeight -= 1) {
            if (!barcodeConstraints.wouldExtendIntoSafetyZone(testHeight, currentYOffset)) {
              processedValue = testHeight;
              break;
            }
          }
          // Update local state to reflect the clamped value
          setLocalHeightPercent(processedValue.toString());
        } else {
          // Reduce Y offset until safe (can go negative)
          for (let testYOffset = processedValue; testYOffset >= -50; testYOffset -= 1) {
            if (!barcodeConstraints.wouldExtendIntoSafetyZone(currentHeight, testYOffset)) {
              processedValue = testYOffset;
              break;
            }
          }
          // Update local state to reflect the clamped value
          setLocalYOffsetPercent(processedValue.toString());
        }
      }
      
      // Always update the store with the final value (clamped or original)
      setDesignData({ [name]: processedValue } as Partial<DesignData>);
    }
  };

  // Effect to fix existing values when book size changes (Y-axis only)
  // Only triggers when book trim size changes, not when user types in input fields
  // ESLint warning about missing dependencies is intentional - we don't want this to trigger during typing
  useEffect(() => {
    if (designData.backCoverBlurbEnableBox) {
      const currentHeight = designData.backCoverBlurbBoxHeightPercent || 30;
      const currentYOffset = designData.backCoverBlurbBoxYOffsetPercent || 10;
      
      // Check if current configuration extends into safety zone
      if (barcodeConstraints.wouldExtendIntoSafetyZone(currentHeight, currentYOffset)) {
        const updates: Partial<DesignData> = {};
        
        // Try to fix by reducing height first
        let fixedHeight = currentHeight;
        for (let h = currentHeight; h >= 10; h -= 5) {
          if (!barcodeConstraints.wouldExtendIntoSafetyZone(h, currentYOffset)) {
            fixedHeight = h;
            break;
          }
        }
        
        // If height reduction didn't work, reduce Y offset (can go negative)
        let fixedYOffset = currentYOffset;
        if (barcodeConstraints.wouldExtendIntoSafetyZone(fixedHeight, currentYOffset)) {
          for (let y = currentYOffset; y >= -50; y -= 5) {
            if (!barcodeConstraints.wouldExtendIntoSafetyZone(fixedHeight, y)) {
              fixedYOffset = y;
              break;
            }
          }
        }
        
        // Apply fixes if values changed
        if (fixedHeight !== currentHeight) updates.backCoverBlurbBoxHeightPercent = fixedHeight;
        if (fixedYOffset !== currentYOffset) updates.backCoverBlurbBoxYOffsetPercent = fixedYOffset;
        
        if (Object.keys(updates).length > 0) {
          setDesignData(updates);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookDetails.trimSize, designData.backCoverBlurbEnableBox]); // Only trigger on book size changes, not field changes

  // Directly use designData from store, with fallbacks for potentially undefined values if necessary
  // Our initialDesignData in store.ts should provide these defaults now.
  const { 
    backCoverBackgroundColor = '#FFFFFF', 
    backCoverText = '', 
    backCoverFont = 'Arial, sans-serif', 
    backCoverFontSize = 10, 
    backCoverTextColor = '#000000',
  } = designData;

  const handleSuggestDallePrompt = async () => {
    setIsSuggestingPrompt(true);
    setAiError(null);
    setSuggestedDallePrompt('');
    
    // Track AI prompt suggestion attempt
    analytics.trackAIGeneration('prompt_suggestion', session?.user?.email || undefined, {
      inputs: aiPromptInputs,
      targetDimensions
    });
    
    try {
      const response = await fetch('/api/ai-prompt-suggester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...aiPromptInputs, 
          targetWidthPx: targetDimensions.widthPx,
          targetHeightPx: targetDimensions.heightPx,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        analytics.trackError(`Prompt suggestion failed: ${errorData.error}`, 'ai_prompt', session?.user?.email || undefined);
        throw new Error(errorData.error || 'Failed to suggest prompt');
      }
      const result = await response.json();
      setSuggestedDallePrompt(result.suggestedPrompt);
      // Copy suggested prompt to the main design data for DALL-E generation
      setDesignData({ backCoverAIPrompt: result.suggestedPrompt });
      
      // Track successful prompt suggestion
      analytics.trackUserAction('prompt_suggestion_success', 'ai', undefined, session?.user?.email || undefined);
    } catch (error) {
      // Type guard for error
      if (error instanceof Error) {
        setAiError(error.message || 'An unexpected error occurred while suggesting prompt.');
        analytics.trackError(`Prompt suggestion error: ${error.message}`, 'ai_prompt', session?.user?.email || undefined);
      } else {
        setAiError('An unexpected error occurred while suggesting prompt.');
        analytics.trackError('Unknown prompt suggestion error', 'ai_prompt', session?.user?.email || undefined);
      }
    } finally {
      setIsSuggestingPrompt(false);
    }
  };

  const handleGenerateAIImage = async () => {
    if (!designData.backCoverAIPrompt) { // Check the prompt from the store
      setAiError('No DALL-E prompt available. Please suggest or enter a prompt.');
      return;
    }
    setIsGeneratingAI(true);
    setAiError(null);
    
    // Track AI image generation attempt
    analytics.trackAIGeneration('image_generation', session?.user?.email || undefined, {
      prompt: designData.backCoverAIPrompt,
      targetDimensions
    });
    
    try {
      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: designData.backCoverAIPrompt, 
          targetWidthPx: targetDimensions.widthPx, 
          targetHeightPx: targetDimensions.heightPx 
        }), 
      });

      if (!response.ok) {
        const errorData = await response.json();
        analytics.trackError(`Image generation failed: ${errorData.error}`, 'ai_generation', session?.user?.email || undefined);
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const result = await response.json();
      console.log('BackCoverControls: Received image_url from API:', result.image_url); // DEBUG LINE
      setDesignData({ backCoverAIImageURL: result.image_url });
      
      // Track successful image generation
      analytics.trackUserAction('image_generation_success', 'ai', undefined, session?.user?.email || undefined);
      
      // Clear structured inputs and suggested prompt
      setAiPromptInputs({ motifs: '', elements: '', setting: '', style: '', colors: '' });
      setSuggestedDallePrompt('');
    } catch (error) {
      console.error('Error calling AI generation API:', error);
      // Type guard for error
      if (error instanceof Error) {
        setAiError(error.message || 'An unexpected error occurred.');
        analytics.trackError(`Image generation error: ${error.message}`, 'ai_generation', session?.user?.email || undefined);
      } else {
        setAiError('An unexpected error occurred.');
        analytics.trackError('Unknown image generation error', 'ai_generation', session?.user?.email || undefined);
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded-md space-y-4">
      <h3 className="text-lg font-semibold">Back Cover Customization</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">Background Type</label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setDesignData({ backCoverBackgroundType: 'flat' })}
            className={`px-4 py-2 border border-gray-300 rounded-l-md text-sm font-medium
              ${(designData.backCoverBackgroundType === undefined || designData.backCoverBackgroundType === 'flat') ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700'}
              hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            Flat
          </button>
          <button
            type="button"
            onClick={() => setDesignData({ backCoverBackgroundType: 'gradient' })}
            className={`px-4 py-2 border-t border-b border-r border-gray-300 rounded-r-md text-sm font-medium
              ${designData.backCoverBackgroundType === 'gradient' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700'}
              hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            Gradient
          </button>
          <button
            type="button"
            onClick={() => setDesignData({ backCoverBackgroundType: 'pattern' })}
            className={`px-4 py-2 border-t border-b border-gray-300 text-sm font-medium
              ${designData.backCoverBackgroundType === 'pattern' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700'}
              hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            Pattern
          </button>
          {/* Placeholder for AI type */}
          {/* <button type="button" disabled className="px-4 py-2 border-t border-b border-r border-gray-300 rounded-r-md text-sm font-medium bg-gray-50 text-gray-400 cursor-not-allowed">AI</button> */}
          <button
            type="button"
            onClick={() => setDesignData({ backCoverBackgroundType: 'ai' })}
            className={`px-4 py-2 border-t border-b border-r border-gray-300 rounded-r-md text-sm font-medium
              ${designData.backCoverBackgroundType === 'ai' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700'}
              hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            AI
          </button>
        </div>
      </div>

      {(designData.backCoverBackgroundType === undefined || designData.backCoverBackgroundType === 'flat') && (
        <div>
          <label htmlFor="backCoverBackgroundColor" className="block text-sm font-medium text-gray-700">Background Color</label>
          <input
            type="color"
            id="backCoverBackgroundColor"
            name="backCoverBackgroundColor"
            value={backCoverBackgroundColor}
            onChange={handleChange}
            className="mt-1 block w-full h-10 px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      )}

      {designData.backCoverBackgroundType === 'gradient' && (
        <>
          <div>
            <label htmlFor="backCoverGradientStartColor" className="block text-sm font-medium text-gray-700">Gradient Start Color</label>
            <input
              type="color"
              id="backCoverGradientStartColor"
              name="backCoverGradientStartColor"
              value={designData.backCoverGradientStartColor || '#FFFFFF'}
              onChange={handleChange}
              className="mt-1 block w-full h-10 px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="backCoverGradientEndColor" className="block text-sm font-medium text-gray-700">Gradient End Color</label>
            <input
              type="color"
              id="backCoverGradientEndColor"
              name="backCoverGradientEndColor"
              value={designData.backCoverGradientEndColor || '#000000'}
              onChange={handleChange}
              className="mt-1 block w-full h-10 px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="backCoverGradientDirection" className="block text-sm font-medium text-gray-700">Gradient Direction</label>
            <select
              id="backCoverGradientDirection"
              name="backCoverGradientDirection"
              value={designData.backCoverGradientDirection || 'vertical'}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
            </select>
          </div>
        </>
      )}

      {designData.backCoverBackgroundType === 'pattern' && (
        <>
          <div>
            <label htmlFor="backCoverPatternType" className="block text-sm font-medium text-gray-700">Pattern Type</label>
            <select
              id="backCoverPatternType"
              name="backCoverPatternType"
              value={designData.backCoverPatternType || 'stripes'}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="stripes">Stripes</option>
              <option value="dots">Dots</option>
              <option value="checkerboard">Checkerboard</option>
              <option value="diagonal">Diagonal Lines</option>
              <option value="grid">Grid</option>
              <option value="circles">Circles</option>
              <option value="triangles">Triangles</option>
              <option value="hexagons">Hexagons</option>
              <option value="waves">Waves</option>
              <option value="diamonds">Diamonds</option>
            </select>
          </div>

          {designData.backCoverPatternType === 'stripes' && (
            <div>
              <label htmlFor="backCoverPatternDirection" className="block text-sm font-medium text-gray-700">Stripe Direction</label>
              <select
                id="backCoverPatternDirection"
                name="backCoverPatternDirection"
                value={designData.backCoverPatternDirection || 'vertical'}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="backCoverPatternColor1" className="block text-sm font-medium text-gray-700">Pattern Color 1</label>
            <input
              type="color"
              id="backCoverPatternColor1"
              name="backCoverPatternColor1"
              value={designData.backCoverPatternColor1 || '#FFFFFF'}
              onChange={handleChange}
              className="mt-1 block w-full h-10 px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="backCoverPatternColor2" className="block text-sm font-medium text-gray-700">Pattern Color 2</label>
            <input
              type="color"
              id="backCoverPatternColor2"
              name="backCoverPatternColor2"
              value={designData.backCoverPatternColor2 || '#DDDDDD'}
              onChange={handleChange}
              className="mt-1 block w-full h-10 px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="backCoverPatternScale" className="block text-sm font-medium text-gray-700">Pattern Scale (px)</label>
            <input
              type="number"
              id="backCoverPatternScale"
              name="backCoverPatternScale"
              value={designData.backCoverPatternScale || 20}
              onChange={handleChange}
              min="5"
              max="100"
              step="1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </>
      )}

      {designData.backCoverBackgroundType === 'ai' && (
        <div className="space-y-3 p-3 border border-dashed border-indigo-300 rounded-md">
          <h4 className="text-md font-semibold text-indigo-700">AI Back Cover Generation</h4>
          
          <p className="text-xs text-gray-600">Describe the key aspects of the image you want for your back cover. Our AI will then suggest a DALL-E prompt for you to review.</p>

          <div>
            <label htmlFor="ai_motifs" className="block text-sm font-medium text-gray-700">Main Motifs/Themes</label>
            <input type="text" name="motifs" id="ai_motifs" value={aiPromptInputs.motifs} onChange={handleAIInputChange} placeholder="e.g., ancient symbols, futuristic city, nature's serenity" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" disabled={isSuggestingPrompt || isGeneratingAI}/>
          </div>
          <div>
            <label htmlFor="ai_elements" className="block text-sm font-medium text-gray-700">Specific Elements/Objects</label>
            <input type="text" name="elements" id="ai_elements" value={aiPromptInputs.elements} onChange={handleAIInputChange} placeholder="e.g., a lone wolf, a mysterious artifact, a spaceship" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" disabled={isSuggestingPrompt || isGeneratingAI}/>
          </div>
          <div>
            <label htmlFor="ai_setting" className="block text-sm font-medium text-gray-700">Setting/Environment</label>
            <input type="text" name="setting" id="ai_setting" value={aiPromptInputs.setting} onChange={handleAIInputChange} placeholder="e.g., enchanted forest, dystopian city, outer space" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" disabled={isSuggestingPrompt || isGeneratingAI}/>
          </div>
          <div>
            <label htmlFor="ai_style" className="block text-sm font-medium text-gray-700">Artistic Style</label>
            <input type="text" name="style" id="ai_style" value={aiPromptInputs.style} onChange={handleAIInputChange} placeholder="e.g., watercolor, minimalist, art deco, photorealistic" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" disabled={isSuggestingPrompt || isGeneratingAI}/>
          </div>
          <div>
            <label htmlFor="ai_colors" className="block text-sm font-medium text-gray-700">Preferred Colors</label>
            <input type="text" name="colors" id="ai_colors" value={aiPromptInputs.colors} onChange={handleAIInputChange} placeholder="e.g., deep blues and purples, earthy tones, vibrant neons" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" disabled={isSuggestingPrompt || isGeneratingAI}/>
          </div>

          <button
            type="button"
            onClick={handleSuggestDallePrompt}
            className="mt-2 w-full flex justify-center items-center space-x-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSuggestingPrompt || isGeneratingAI || Object.values(aiPromptInputs).every(x => x === '')}
          >
            {isSuggestingPrompt && <LoadingSpinner size="sm" className="text-white" />}
            <span>{isSuggestingPrompt ? 'Suggesting Prompt...' : 'Suggest DALL-E Prompt'}</span>
          </button>

          {suggestedDallePrompt && (
            <div className="mt-3 pt-3 border-t border-gray-300">
              <label htmlFor="backCoverAIPrompt" className="block text-sm font-medium text-gray-700">Suggested DALL-E Prompt (Editable)</label>
              <textarea
                id="backCoverAIPrompt" // This name matches DesignData field
                name="backCoverAIPrompt" // This name matches DesignData field
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={designData.backCoverAIPrompt || ''} // Controlled by Zustand store via setDesignData
                onChange={(e) => setDesignData({ backCoverAIPrompt: e.target.value })} // Update Zustand store directly
                disabled={isGeneratingAI}
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerateAIImage} // This function will use designData.backCoverAIPrompt
            className="mt-2 w-full flex justify-center items-center space-x-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isGeneratingAI || isSuggestingPrompt || !designData.backCoverAIPrompt}
          >
            {isGeneratingAI && <LoadingSpinner size="sm" className="text-white" />}
            <span>{isGeneratingAI ? 'Generating Image...' : 'Confirm Prompt & Generate Image'}</span>
          </button>

          {aiError && (
            <p className="mt-2 text-sm text-red-600">Error: {aiError}</p>
          )}
          {designData.backCoverAIImageURL && !isGeneratingAI && (
            <div className="mt-4 pt-3 border-t border-gray-300">
              <h5 className="text-sm font-semibold text-gray-800">Generated Image:</h5>
              <div className="relative mt-2 border border-gray-300 rounded overflow-hidden" style={{ width: '150px', height: '150px' }}>
                <Image 
                  src={designData.backCoverAIImageURL} 
                  alt="AI Generated Back Cover" 
                  layout="fill" 
                  objectFit="contain"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 break-all">URL (dev): {designData.backCoverAIImageURL}</p>
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="backCoverText" className="block text-sm font-medium text-gray-700">Blurb / Description</label>
        <textarea
          id="backCoverText"
          name="backCoverText"
          value={backCoverText}
          onChange={handleChange}
          rows={4}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Enter back cover text here..."
        />
      </div>
      
      {/* Simple text styling controls - UI only for now */}
      <fieldset className="border p-2 rounded-md">
        <legend className="text-sm font-medium text-gray-700 px-1">Text Styling (Blurb)</legend>
        <div className="space-y-2 mt-1">
          <div>
            <label htmlFor="backCoverFont" className="block text-xs font-medium text-gray-600">Font Family</label>
            <select
              id="backCoverFont"
              name="backCoverFont"
              value={backCoverFont}
              onChange={handleChange}
              className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              style={{ fontFamily: backCoverFont }}
            >
              {fontOptions.map(font => (
                <option 
                  key={font.name} 
                  value={font.value}
                  style={{ fontFamily: font.value }}
                >
                  {font.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="backCoverFontSize" className="block text-xs font-medium text-gray-600">Font Size (pt)</label>
            <input
              type="number"
              id="backCoverFontSize"
              name="backCoverFontSize"
              value={backCoverFontSize}
              onChange={handleChange}
              min="6"
              max="36"
              className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="backCoverTextColor" className="block text-xs font-medium text-gray-600">Text Color</label>
            <input
              type="color"
              id="backCoverTextColor"
              name="backCoverTextColor"
              value={backCoverTextColor}
              onChange={handleChange}
              className="mt-1 block w-full h-8 px-1 py-1 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="backCoverTextAlign" className="block text-xs font-medium text-gray-600">Text Alignment</label>
            <select
              id="backCoverTextAlign"
              name="backCoverTextAlign"
              value={designData.backCoverTextAlign || 'left'}
              onChange={handleChange}
              className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="justify">Justify</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* Blurb Container Box Controls */}
      <fieldset className="border p-2 rounded-md">
        <legend className="text-sm font-medium text-gray-700 px-1">Blurb Container Box</legend>
        <div className="space-y-3 mt-1">
          <div className="flex items-center">
            <input
              id="backCoverBlurbEnableBox"
              name="backCoverBlurbEnableBox"
              type="checkbox"
              checked={!!designData.backCoverBlurbEnableBox}
              onChange={(e) => setDesignData({ backCoverBlurbEnableBox: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="backCoverBlurbEnableBox" className="ml-2 block text-sm text-gray-900">
              Enable Blurb Box
            </label>
          </div>

          {designData.backCoverBlurbEnableBox && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="backCoverBlurbBoxFillColor" className="block text-xs font-medium text-gray-600">Box Fill Color</label>
                  <input
                    type="color"
                    id="backCoverBlurbBoxFillColor"
                    name="backCoverBlurbBoxFillColor"
                    value={designData.backCoverBlurbBoxFillColor || '#FFFFFF'}
                    onChange={handleChange}
                    className="mt-1 block w-full h-8 px-1 py-1 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
                <div>
                  <label htmlFor="backCoverBlurbBoxOpacity" className="block text-xs font-medium text-gray-600">Box Opacity (0-1)</label>
                  <input
                    type="number"
                    id="backCoverBlurbBoxOpacity"
                    name="backCoverBlurbBoxOpacity"
                    value={designData.backCoverBlurbBoxOpacity === undefined ? 1 : designData.backCoverBlurbBoxOpacity}
                    onChange={handleChange}
                    min="0" max="1" step="0.1"
                    className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="backCoverBlurbBoxCornerRadius" className="block text-xs font-medium text-gray-600">Corner Radius (px)</label>
                  <input
                    type="number"
                    id="backCoverBlurbBoxCornerRadius"
                    name="backCoverBlurbBoxCornerRadius"
                    value={designData.backCoverBlurbBoxCornerRadius || 20}
                    onChange={handleChange}
                    min="0" max="100" step="1"
                    className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="backCoverBlurbBoxPadding" className="block text-xs font-medium text-gray-600">Inner Padding (px)</label>
                  <input
                    type="number"
                    id="backCoverBlurbBoxPadding"
                    name="backCoverBlurbBoxPadding"
                    value={designData.backCoverBlurbBoxPadding || 15}
                    onChange={handleChange}
                    min="0" max="50" step="1"
                    className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 col-span-2">Position and Size (centered horizontally with fixed margins):</p>
              <p className="text-xs text-amber-600 col-span-2">⚠️ Blurb box cannot extend below {barcodeConstraints.maxSafeVerticalPercent}% to protect barcode area</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="backCoverBlurbBoxLeftMarginPercent" className="block text-xs font-medium text-gray-600">Left/Right Margin (%)</label>
                  <input type="number" id="backCoverBlurbBoxLeftMarginPercent" name="backCoverBlurbBoxLeftMarginPercent" value={designData.backCoverBlurbBoxLeftMarginPercent || 10} onChange={handleChange} min="5" max="30" step="1" className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs" />
                </div>
                <div>
                  <label htmlFor="backCoverBlurbBoxYOffsetPercent" className="block text-xs font-medium text-gray-600">Y Offset (%) - Negative moves toward top</label>
                  <input type="number" id="backCoverBlurbBoxYOffsetPercent" name="backCoverBlurbBoxYOffsetPercent" value={localYOffsetPercent} onChange={handleChange} onBlur={handleBlur} min="-50" max="100" step="1" className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="backCoverBlurbBoxHeightPercent" className="block text-xs font-medium text-gray-600">Height (%)</label>
                  <input type="number" id="backCoverBlurbBoxHeightPercent" name="backCoverBlurbBoxHeightPercent" value={localHeightPercent} onChange={handleChange} onBlur={handleBlur} min="10" max="100" step="1" className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs" />
                </div>
              </div>
            </>
          )}
        </div>
      </fieldset>

      <div className="p-2 border-dashed border-red-300 bg-red-50 rounded-md text-center">
        <p className="text-sm text-red-600 font-medium">⚠️ Protected Barcode Area</p>
        <p className="text-xs text-red-500">Bottom-right corner: {barcodeConstraints.barcodeWidthPercent}% × {barcodeConstraints.barcodeHeightPercent}% + margins</p>
        <p className="text-xs text-red-500">Blurb boxes kept above {barcodeConstraints.maxSafeVerticalPercent}% with {barcodeConstraints.safetyBufferPercent}% safety buffer</p>
      </div>

    </div>
  );
} 