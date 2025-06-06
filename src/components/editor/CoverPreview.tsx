'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useProjectStore } from '@/lib/store';
import { DesignData, BookDetails } from '@/types';
import { useFontLoader } from '@/hooks/useFontLoader';
import { useSession } from 'next-auth/react';
import { analytics } from '@/lib/analytics';

// Constants for rendering - these can be made dynamic later
const RENDER_PPI = 72; // Pixels per inch for rendering on canvas
const inchToPx = (inches: number, ppi: number = RENDER_PPI) => inches * ppi;
const mmToPx = (mm: number, ppi: number = RENDER_PPI) => (mm / 25.4) * ppi;

// Default colors
const DEFAULT_SPINE_COLOR = '#E0E0E0'; // Light gray
const DEFAULT_BACK_COVER_COLOR = '#F0F0F0'; // Lighter gray

// Constants for guidelines
const BLEED_INCHES = 0.125;
const SAFE_MARGIN_COVER_INCHES = 0.25; // Margin from trim for critical content on front/back
const SAFE_MARGIN_SPINE_INCHES = 0.0625; // Margin from spine edge for spine text

// Constants for Barcode Area
const BARCODE_AREA_WIDTH_INCHES = 2.0;
const BARCODE_AREA_HEIGHT_INCHES = 1.2;
const BARCODE_MARGIN_FROM_TRIM_EDGE_INCHES = 0.25;

export default function CoverPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: session } = useSession();
  const { bookDetails, coverImage, getCalculatedSpineWidth, designData, currentProjectId } = useProjectStore();
  
  const [loadedFrontCoverImage, setLoadedFrontCoverImage] = useState<HTMLImageElement | null>(null);
  const [currentFrontCoverObjectUrl, setCurrentFrontCoverObjectUrl] = useState<string | null>(null);
  
  const [loadedAIBackCoverImage, setLoadedAIBackCoverImage] = useState<HTMLImageElement | null>(null);
  const [currentAIBackCoverImageUrl, setCurrentAIBackCoverImageUrl] = useState<string | null>(null);

  // Font loading state
  const { fontsLoaded, loadingProgress } = useFontLoader();

  // State for zoom and pan
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Min and Max zoom scale
  const MIN_SCALE = 0.2;
  const MAX_SCALE = 5;


  // Reusable drawing function
  const drawCover = useCallback((
    currentCtx: CanvasRenderingContext2D, 
    currentCanvas: HTMLCanvasElement, 
    applyTransform: boolean,
    currentBookDetails: BookDetails, 
    currentDesignData: DesignData,
    spineWidthMM: number,
    frontImage: HTMLImageElement | null,
    aiBackImage: HTMLImageElement | null,
    shouldDrawGuidelines: boolean,
    exportTargetDPI: number | null = null // Added for DPI scaling
  ) => {
    // Enhanced text wrapping function with alignment and line break support
    function wrapTextWithAlignment(
      context: CanvasRenderingContext2D, 
      text: string, 
      x: number, 
      y: number, 
      maxWidth: number, 
      lineHeight: number,
      alignment: 'left' | 'center' | 'right' | 'justify' = 'left'
    ) {
      // Split by manual line breaks first
      const paragraphs = text.split(/\r?\n/);
      let currentY = y;
      
      paragraphs.forEach((paragraph, paragraphIndex) => {
        if (paragraph.trim() === '') {
          // Empty line - add spacing
          currentY += lineHeight;
          return;
        }
        
        const words = paragraph.split(' ').filter(word => word.length > 0);
        if (words.length === 0) return;
        
        const lines: string[] = [];
        let currentLine = '';
        
        // Build lines for this paragraph
        for (let i = 0; i < words.length; i++) {
          const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
          const metrics = context.measureText(testLine);
          
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        
        if (currentLine) {
          lines.push(currentLine);
        }
        
        // Draw lines with alignment
        lines.forEach((line, lineIndex) => {
          const isLastLineOfParagraph = lineIndex === lines.length - 1;
          
          let lineX = x;
          
          switch (alignment) {
            case 'center':
              const centerWidth = context.measureText(line).width;
              lineX = x + (maxWidth - centerWidth) / 2;
              break;
              
            case 'right':
              const rightWidth = context.measureText(line).width;
              lineX = x + maxWidth - rightWidth;
              break;
              
            case 'justify':
              // Don't justify the last line of a paragraph or single-word lines
              if (!isLastLineOfParagraph && line.includes(' ')) {
                drawJustifiedLine(context, line, x, currentY, maxWidth);
                currentY += lineHeight;
                return;
              }
              // Fall through to left alignment for last lines
              break;
              
            case 'left':
            default:
              lineX = x;
              break;
          }
          
          context.fillText(line, lineX, currentY);
          currentY += lineHeight;
        });
        
        // Add extra space between paragraphs (except after the last one)
        if (paragraphIndex < paragraphs.length - 1) {
          currentY += lineHeight * 0.5; // Half line spacing between paragraphs
        }
      });
    }
    
    // Helper function for justified text
    function drawJustifiedLine(context: CanvasRenderingContext2D, line: string, x: number, y: number, maxWidth: number) {
      const words = line.split(' ');
      if (words.length <= 1) {
        context.fillText(line, x, y);
        return;
      }
      
      const totalWordsWidth = words.reduce((total, word) => total + context.measureText(word).width, 0);
      const totalSpaceWidth = maxWidth - totalWordsWidth;
      const spaceWidth = totalSpaceWidth / (words.length - 1);
      
      let currentX = x;
      words.forEach((word, index) => {
        context.fillText(word, currentX, y);
        currentX += context.measureText(word).width;
        if (index < words.length - 1) {
          currentX += spaceWidth;
        }
      });
    }
    const ppiForDrawing = exportTargetDPI || RENDER_PPI;
    const scaleFactor = exportTargetDPI ? exportTargetDPI / RENDER_PPI : 1;

    const { title, author, trimSize } = currentBookDetails;
    const parts = trimSize.split('x').map(Number);
    const trimWidthInches = parts[0] || 6;
    const trimHeightInches = parts[1] || 9;
    const bleedPx = inchToPx(BLEED_INCHES, ppiForDrawing);

    const coverHeightPx_trim = inchToPx(trimHeightInches, ppiForDrawing);
    const frontCoverWidthPx_trim = inchToPx(trimWidthInches, ppiForDrawing);
    const spineWidthPx_trim = mmToPx(spineWidthMM, ppiForDrawing);
    const backCoverWidthPx_trim = frontCoverWidthPx_trim;
    
    const contentWidth = backCoverWidthPx_trim + spineWidthPx_trim + frontCoverWidthPx_trim + (2 * bleedPx);
    const contentHeight = coverHeightPx_trim + (2 * bleedPx);

    // Canvas dimensions are set by the caller for export, otherwise defaults here for preview
    if (!exportTargetDPI) {
        currentCanvas.width = contentWidth;
        currentCanvas.height = contentHeight;
    } // For export, caller must have set canvas.width/height appropriately scaled

    currentCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);

    if (applyTransform && !exportTargetDPI) { // Only apply interactive transform if not exporting at specific DPI
      currentCtx.save(); // Outer save for zoom/pan transform
      currentCtx.translate(offset.x, offset.y);
      currentCtx.scale(scale, scale);
    }

    // --- 1. Back Cover Panel (includes left, top, bottom bleed relative to its panel) ---
    const bcPanelX = 0;
    const bcPanelY = 0;
    const bcPanelWidth = backCoverWidthPx_trim + bleedPx; // Extends to the spine fold line
    const bcPanelHeight = contentHeight; 

    currentCtx.save(); // Save for back cover specific operations + clipping
    currentCtx.beginPath();
    currentCtx.rect(bcPanelX, bcPanelY, bcPanelWidth, bcPanelHeight);
    currentCtx.clip();

    if (currentDesignData.backCoverBackgroundType === 'ai' && aiBackImage && currentDesignData.backCoverAIImageURL) {
      const imgWidth = aiBackImage.naturalWidth;
      const imgHeight = aiBackImage.naturalHeight;
      const canvasAspect = bcPanelWidth / bcPanelHeight;
      const imgAspect = imgWidth / imgHeight;
      let sx, sy, sWidth, sHeight;
      if (imgAspect > canvasAspect) { 
        sHeight = imgHeight; sWidth = imgHeight * canvasAspect; sx = (imgWidth - sWidth) / 2; sy = 0;
      } else { 
        sWidth = imgWidth; sHeight = imgWidth / canvasAspect; sx = 0; sy = (imgHeight - sHeight) / 2;
      }
      currentCtx.drawImage(aiBackImage, sx, sy, sWidth, sHeight, bcPanelX, bcPanelY, bcPanelWidth, bcPanelHeight);
    } else if (currentDesignData.backCoverBackgroundType === 'gradient' && currentDesignData.backCoverGradientStartColor && currentDesignData.backCoverGradientEndColor) {
      let gradient;
      if (currentDesignData.backCoverGradientDirection === 'horizontal') {
        gradient = currentCtx.createLinearGradient(bcPanelX, bcPanelY, bcPanelX + bcPanelWidth, bcPanelY);
      } else { 
        gradient = currentCtx.createLinearGradient(bcPanelX, bcPanelY, bcPanelX, bcPanelY + bcPanelHeight);
      }
      gradient.addColorStop(0, currentDesignData.backCoverGradientStartColor);
      gradient.addColorStop(1, currentDesignData.backCoverGradientEndColor);
      currentCtx.fillStyle = gradient;
      currentCtx.fillRect(bcPanelX, bcPanelY, bcPanelWidth, bcPanelHeight);
    } else if (currentDesignData.backCoverBackgroundType === 'pattern' && currentDesignData.backCoverPatternType) {
      const patternScale = currentDesignData.backCoverPatternScale || 20;
      const color1 = currentDesignData.backCoverPatternColor1 || '#FFFFFF';
      const color2 = currentDesignData.backCoverPatternColor2 || '#DDDDDD';
      currentCtx.fillStyle = color1;
      currentCtx.fillRect(bcPanelX, bcPanelY, bcPanelWidth, bcPanelHeight);
      switch (currentDesignData.backCoverPatternType) {
        case 'stripes':
          const direction = currentDesignData.backCoverPatternDirection || 'vertical';
          const stripePatternSize = (patternScale) * scaleFactor;
          for (let i = 0; i * stripePatternSize < (direction === 'vertical' ? bcPanelWidth : bcPanelHeight); i++) {
            currentCtx.fillStyle = (i % 2 === 0) ? color1 : color2;
            if (direction === 'vertical') {
              currentCtx.fillRect(bcPanelX + i * stripePatternSize, bcPanelY, stripePatternSize, bcPanelHeight);
            } else {
              currentCtx.fillRect(bcPanelX, bcPanelY + i * stripePatternSize, bcPanelWidth, stripePatternSize);
            }
          }
          break;
        case 'dots':
          currentCtx.fillStyle = color2;
          const dotPatternSize = (patternScale) * scaleFactor;
          const radius = dotPatternSize / 2;
          for (let y = radius; y < bcPanelHeight; y += dotPatternSize * 1.5) {
            for (let x = radius; x < bcPanelWidth; x += dotPatternSize * 1.5) {
              currentCtx.beginPath(); currentCtx.arc(bcPanelX + x, bcPanelY + y, radius, 0, 2 * Math.PI); currentCtx.fill();
            }
          }
          break;
        case 'checkerboard':
          const checkerPatternSize = (patternScale) * scaleFactor;
          for (let y = 0; y * checkerPatternSize < bcPanelHeight; y++) {
            for (let x = 0; x * checkerPatternSize < bcPanelWidth; x++) {
              currentCtx.fillStyle = ((x + y) % 2 === 0) ? color1 : color2;
              currentCtx.fillRect(bcPanelX + x * checkerPatternSize, bcPanelY + y * checkerPatternSize, checkerPatternSize, checkerPatternSize);
            }
          }
          break;
        case 'diagonal':
          currentCtx.strokeStyle = color2;
          currentCtx.lineWidth = (patternScale / 4) * scaleFactor;
          const diagonalSpacing = patternScale * scaleFactor;
          currentCtx.beginPath();
          for (let i = -bcPanelHeight; i < bcPanelWidth + bcPanelHeight; i += diagonalSpacing) {
            currentCtx.moveTo(bcPanelX + i, bcPanelY);
            currentCtx.lineTo(bcPanelX + i + bcPanelHeight, bcPanelY + bcPanelHeight);
          }
          currentCtx.stroke();
          break;
        case 'grid':
          currentCtx.strokeStyle = color2;
          currentCtx.lineWidth = 1 * scaleFactor;
          const gridSize = patternScale * scaleFactor;
          currentCtx.beginPath();
          for (let x = 0; x <= bcPanelWidth; x += gridSize) {
            currentCtx.moveTo(bcPanelX + x, bcPanelY);
            currentCtx.lineTo(bcPanelX + x, bcPanelY + bcPanelHeight);
          }
          for (let y = 0; y <= bcPanelHeight; y += gridSize) {
            currentCtx.moveTo(bcPanelX, bcPanelY + y);
            currentCtx.lineTo(bcPanelX + bcPanelWidth, bcPanelY + y);
          }
          currentCtx.stroke();
          break;
        case 'circles':
          currentCtx.fillStyle = color2;
          const circlePatternSize = patternScale * scaleFactor;
          const circleRadius = circlePatternSize / 3;
          for (let y = circlePatternSize; y < bcPanelHeight; y += circlePatternSize) {
            for (let x = circlePatternSize; x < bcPanelWidth; x += circlePatternSize) {
              currentCtx.beginPath();
              currentCtx.arc(bcPanelX + x, bcPanelY + y, circleRadius, 0, 2 * Math.PI);
              currentCtx.fill();
            }
          }
          break;
        case 'triangles':
          currentCtx.fillStyle = color2;
          const triangleSize = patternScale * scaleFactor;
          const triangleHeight = triangleSize * 0.866;
          for (let y = 0; y < bcPanelHeight; y += triangleHeight) {
            for (let x = 0; x < bcPanelWidth; x += triangleSize) {
              const isEvenRow = Math.floor(y / triangleHeight) % 2 === 0;
              const offsetX = isEvenRow ? 0 : triangleSize / 2;
              currentCtx.beginPath();
              currentCtx.moveTo(bcPanelX + x + offsetX, bcPanelY + y);
              currentCtx.lineTo(bcPanelX + x + offsetX + triangleSize / 2, bcPanelY + y + triangleHeight);
              currentCtx.lineTo(bcPanelX + x + offsetX - triangleSize / 2, bcPanelY + y + triangleHeight);
              currentCtx.closePath();
              currentCtx.fill();
            }
          }
          break;
        case 'hexagons':
          currentCtx.fillStyle = color2;
          const hexSize = patternScale * scaleFactor;
          const hexHeight = hexSize * 0.866;
          const hexWidth = hexSize * 1.5;
          for (let y = 0; y < bcPanelHeight + hexHeight; y += hexHeight * 1.5) {
            for (let x = 0; x < bcPanelWidth + hexWidth; x += hexWidth) {
              const isEvenRow = Math.floor(y / (hexHeight * 1.5)) % 2 === 0;
              const offsetX = isEvenRow ? 0 : hexWidth / 2;
              const centerX = bcPanelX + x + offsetX;
              const centerY = bcPanelY + y + hexHeight / 2;
              
              currentCtx.beginPath();
              for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const hx = centerX + Math.cos(angle) * hexSize / 2;
                const hy = centerY + Math.sin(angle) * hexSize / 2;
                if (i === 0) currentCtx.moveTo(hx, hy);
                else currentCtx.lineTo(hx, hy);
              }
              currentCtx.closePath();
              currentCtx.fill();
            }
          }
          break;
        case 'waves':
          currentCtx.strokeStyle = color2;
          currentCtx.lineWidth = (patternScale / 6) * scaleFactor;
          const waveHeight = patternScale * scaleFactor;
          const waveLength = patternScale * 2 * scaleFactor;
          for (let y = waveHeight; y < bcPanelHeight; y += waveHeight * 2) {
            currentCtx.beginPath();
            currentCtx.moveTo(bcPanelX, bcPanelY + y);
            for (let x = 0; x <= bcPanelWidth; x += 5) {
              const waveY = bcPanelY + y + Math.sin((x / waveLength) * 2 * Math.PI) * (waveHeight / 4);
              currentCtx.lineTo(bcPanelX + x, waveY);
            }
            currentCtx.stroke();
          }
          break;
        case 'diamonds':
          currentCtx.fillStyle = color2;
          const diamondSize = patternScale * scaleFactor;
          for (let y = 0; y < bcPanelHeight; y += diamondSize) {
            for (let x = 0; x < bcPanelWidth; x += diamondSize) {
              const isEvenRow = Math.floor(y / diamondSize) % 2 === 0;
              const offsetX = isEvenRow ? 0 : diamondSize / 2;
              const centerX = bcPanelX + x + offsetX + diamondSize / 2;
              const centerY = bcPanelY + y + diamondSize / 2;
              
              currentCtx.beginPath();
              currentCtx.moveTo(centerX, centerY - diamondSize / 2);
              currentCtx.lineTo(centerX + diamondSize / 2, centerY);
              currentCtx.lineTo(centerX, centerY + diamondSize / 2);
              currentCtx.lineTo(centerX - diamondSize / 2, centerY);
              currentCtx.closePath();
              currentCtx.fill();
            }
          }
          break;
      }
    } else {
      currentCtx.fillStyle = currentDesignData.backCoverBackgroundColor || DEFAULT_BACK_COVER_COLOR;
      currentCtx.fillRect(bcPanelX, bcPanelY, bcPanelWidth, bcPanelHeight);
    }
    currentCtx.restore(); // Restore from back cover panel clip

    // Barcode Area (drawn on top of back cover background, within its trim bounds)
    const barcodeAreaTrimX = bleedPx; // Relative to canvas, not bcPanelX
    const barcodeAreaTrimY = bleedPx;
    const barcodeAreaWidthPx = inchToPx(BARCODE_AREA_WIDTH_INCHES, ppiForDrawing);
    const barcodeAreaHeightPx = inchToPx(BARCODE_AREA_HEIGHT_INCHES, ppiForDrawing);
    const barcodeMarginPx = inchToPx(BARCODE_MARGIN_FROM_TRIM_EDGE_INCHES, ppiForDrawing);
    const barcodeAreaX = barcodeAreaTrimX + backCoverWidthPx_trim - barcodeMarginPx - barcodeAreaWidthPx;
    const barcodeAreaY = barcodeAreaTrimY + coverHeightPx_trim - barcodeMarginPx - barcodeAreaHeightPx;
    currentCtx.save();
    currentCtx.fillStyle = '#FFFFFF';
    currentCtx.fillRect(barcodeAreaX, barcodeAreaY, barcodeAreaWidthPx, barcodeAreaHeightPx);
    currentCtx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
    currentCtx.lineWidth = 1;
    currentCtx.setLineDash([2, 2]);
    currentCtx.strokeRect(barcodeAreaX, barcodeAreaY, barcodeAreaWidthPx, barcodeAreaHeightPx);
    currentCtx.restore();

    // Back Cover Blurb Box & Text (drawn on top of back cover background)
    if (currentDesignData.backCoverBlurbEnableBox) {
        const text = currentDesignData.backCoverText;
        const font = currentDesignData.backCoverFont || 'Arial';
        let fontSize = currentDesignData.backCoverFontSize || 10;
        if (exportTargetDPI) fontSize *= scaleFactor;
        const textColor = currentDesignData.backCoverTextColor || '#000000';
        const boxColor = currentDesignData.backCoverBlurbBoxFillColor || '#FFFFFF';
        const boxOpacity = currentDesignData.backCoverBlurbBoxOpacity === undefined ? 1 : currentDesignData.backCoverBlurbBoxOpacity;
        const cornerRadius = currentDesignData.backCoverBlurbBoxCornerRadius || 20;
        const padding = currentDesignData.backCoverBlurbBoxPadding || 15;
        const leftMarginPercent = currentDesignData.backCoverBlurbBoxLeftMarginPercent || 10;
        const heightPercentage = currentDesignData.backCoverBlurbBoxHeightPercent || 30;
        const offsetYPercentage = currentDesignData.backCoverBlurbBoxYOffsetPercent || 10;

        const blurbRelativeToTrimX = bleedPx;
        const blurbRelativeToTrimY = bleedPx;
        const blurbAreaWidth = backCoverWidthPx_trim;
        const blurbAreaHeight = coverHeightPx_trim;

        // Calculate width based on margins (same margin on left and right)
        const leftMarginPx = blurbAreaWidth * (leftMarginPercent / 100);
        const rightMarginPx = leftMarginPx; // Same margin on both sides
        const boxWidth = blurbAreaWidth - leftMarginPx - rightMarginPx;
        const boxHeight = blurbAreaHeight * (heightPercentage / 100);
        
        // Center horizontally with equal margins
        const boxX = blurbRelativeToTrimX + leftMarginPx;
        
        // Vertical positioning (keep existing Y offset logic)
        const blurbAreaCenterY = blurbRelativeToTrimY + blurbAreaHeight / 2;
        const boxCenterY = blurbAreaCenterY + (blurbAreaHeight / 2) * (offsetYPercentage / 100);
        const boxY = boxCenterY - boxHeight / 2;

        currentCtx.save();
        currentCtx.globalAlpha = boxOpacity;
        currentCtx.fillStyle = boxColor;
        currentCtx.beginPath();
        currentCtx.moveTo(boxX + cornerRadius, boxY);
        currentCtx.lineTo(boxX + boxWidth - cornerRadius, boxY);
        currentCtx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + cornerRadius);
        currentCtx.lineTo(boxX + boxWidth, boxY + boxHeight - cornerRadius);
        currentCtx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - cornerRadius, boxY + boxHeight);
        currentCtx.lineTo(boxX + cornerRadius, boxY + boxHeight);
        currentCtx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - cornerRadius);
        currentCtx.lineTo(boxX, boxY + cornerRadius);
        currentCtx.quadraticCurveTo(boxX, boxY, boxX + cornerRadius, boxY);
        currentCtx.closePath();
        currentCtx.fill();
        currentCtx.globalAlpha = 1.0;
        if (text) {
            currentCtx.fillStyle = textColor;
            currentCtx.font = `${fontSize}px ${font}`;
            currentCtx.textAlign = 'left'; currentCtx.textBaseline = 'top';
            const textDrawAreaX = boxX + padding;
            const textDrawAreaY = boxY + padding;
            const textDrawAreaWidth = boxWidth - (2 * padding);
            const alignment = currentDesignData.backCoverTextAlign || 'left';
            wrapTextWithAlignment(currentCtx, text, textDrawAreaX, textDrawAreaY, textDrawAreaWidth, fontSize * 1.2, alignment);
        }
        currentCtx.restore();
    } else if (currentDesignData.backCoverText) {
        const text = currentDesignData.backCoverText;
        const font = currentDesignData.backCoverFont || 'Arial';
        let fontSize = currentDesignData.backCoverFontSize || 10;
        if (exportTargetDPI) fontSize *= scaleFactor;
        const textColor = currentDesignData.backCoverTextColor || '#000000';
        const paddingValue = inchToPx(0.5, ppiForDrawing);
        currentCtx.fillStyle = textColor;
        currentCtx.font = `${fontSize}px ${font}`;
        currentCtx.textAlign = 'left';
        currentCtx.textBaseline = 'top';
        const alignment = currentDesignData.backCoverTextAlign || 'left';
        wrapTextWithAlignment(currentCtx, text, bleedPx + paddingValue, bleedPx + paddingValue, backCoverWidthPx_trim - (2*paddingValue), fontSize * 1.2, alignment);
    }

    // --- 2. Spine Panel (full bleed area) ---
    const sPanelX = bcPanelWidth; // Starts immediately after the back cover panel
    const sPanelY = 0;
    const sPanelWidth = spineWidthPx_trim;
    const sPanelHeight = contentHeight;

    // Draw spine background (color or gradient) - NO CLIP for background fill
    if (currentDesignData.spineBackgroundType === 'gradient' && currentDesignData.spineGradientStartColor && currentDesignData.spineGradientEndColor) {
      let gradient;
      if (currentDesignData.spineGradientDirection === 'horizontal') {
        gradient = currentCtx.createLinearGradient(sPanelX, sPanelY, sPanelX + sPanelWidth, sPanelY);
      } else {
        gradient = currentCtx.createLinearGradient(sPanelX, sPanelY, sPanelX, sPanelY + sPanelHeight);
      }
      gradient.addColorStop(0, currentDesignData.spineGradientStartColor);
      gradient.addColorStop(1, currentDesignData.spineGradientEndColor);
      currentCtx.fillStyle = gradient;
    } else {
      currentCtx.fillStyle = currentDesignData.spineBackgroundColor || DEFAULT_SPINE_COLOR;
    }
    currentCtx.fillRect(sPanelX, sPanelY, sPanelWidth, sPanelHeight);
    
    // Spine Text (clipped to spine trim area)
    if (title || author) {
        currentCtx.save(); // Save for spine text clipping and transform (Save A)
        const spineTrimX = sPanelX; 
        const spineTrimY = bleedPx;
        const spineTrimWidth = sPanelWidth; 
        const spineTrimHeight = coverHeightPx_trim;
        
        currentCtx.beginPath();
        currentCtx.rect(spineTrimX, spineTrimY, spineTrimWidth, spineTrimHeight);
        currentCtx.clip();

        const spineTextColor = currentDesignData.spineColor || '#000000';
        const spineFont = currentDesignData.spineFont || 'Arial';
        let spineFontSize = currentDesignData.spineFontSize || 12; 
        if (exportTargetDPI) spineFontSize *= scaleFactor;
        
        const safeSpineMarginPx = inchToPx(SAFE_MARGIN_SPINE_INCHES, ppiForDrawing);
        const newAdditionalInsetPx = inchToPx(0.125, ppiForDrawing); 

        // Adjust maxTextWidth for font calculation (along spine length)
        let maxTextWidth = spineTrimHeight - (2 * safeSpineMarginPx) - (2 * newAdditionalInsetPx); 
        if (maxTextWidth < 1) maxTextWidth = 1; 

        const maxTextHeight = spineTrimWidth - (2 * safeSpineMarginPx); 
        // Ensure finalSpineFontSize (after auto-sizing for length) also respects spine width (maxTextHeight)
        // This check should be done AFTER the font auto-sizing loop. (Moved it lower)
        
        currentCtx.fillStyle = spineTextColor;
        
        const _title = title?.trim(); 
        const _author = author?.trim();
        const tempTitle = _title || "Title";
        const tempAuthor = _author || "Author";
        const fullSpineText = `${tempTitle}${tempTitle && tempAuthor ? ' - ' : ''}${tempAuthor}`;

        currentCtx.font = `${spineFontSize}px ${spineFont}`;
        const textMetrics = currentCtx.measureText(fullSpineText);
        let finalSpineFontSize = spineFontSize;

        if (textMetrics.width > maxTextWidth) {
            let tempFontSize = spineFontSize;
            while (tempFontSize > 5) { 
                currentCtx.font = `${tempFontSize}px ${spineFont}`;
                if (currentCtx.measureText(fullSpineText).width <= maxTextWidth) { 
                    finalSpineFontSize = tempFontSize; 
                    break; 
                }
                tempFontSize -= 1;
            }
            if (tempFontSize <= 5 && currentCtx.measureText(fullSpineText).width > maxTextWidth) { 
                finalSpineFontSize = 5; 
            }
        }
        // Now, cap by spine width (which acts as text height for vertical text)
        if (finalSpineFontSize > maxTextHeight) finalSpineFontSize = maxTextHeight;

        currentCtx.font = `${finalSpineFontSize}px ${spineFont}`;
        
        const textPlacementX = spineTrimX + spineTrimWidth / 2; 
        const textPlacementY = spineTrimY + spineTrimHeight / 2; 
        
        currentCtx.save(); // B: For rotation/translation
        currentCtx.translate(textPlacementX, textPlacementY); 
        currentCtx.rotate(Math.PI / 2); 
        // After rotation:
        // newX for fillText is ALONG the spine length (positive is "up" towards book top)
        // newY for fillText is ACROSS the spine width (positive is "right" towards Front Cover)

        currentCtx.textAlign = 'center';
        currentCtx.textBaseline = 'middle'; // Use middle for all cases for simplicity with y=0

        if (_title && _author) {
            // Author in upper part (top of spine), Title in lower part (bottom of spine).
            // Both centered across spine width (y=0).
            // Positive x is "up" along the spine from its center.
            const authorX = spineTrimHeight * 0.25; 
            currentCtx.fillText(_author, authorX, 0);

            const titleX = -spineTrimHeight * 0.25;
            currentCtx.fillText(_title, titleX, 0);
        } else if (_title) { 
            currentCtx.fillText(_title, 0, 0); // Center of spine length and width
        } else if (_author) {
            currentCtx.fillText(_author, 0, 0); // Center of spine length and width
        }
        
        currentCtx.restore(); // B: Restore from rotation/translation
        currentCtx.restore(); // Restore for spine text clipping and transform (Restore A)
    }

    // --- 3. Front Cover Panel (full bleed area) ---
    const fcPanelX = sPanelX + sPanelWidth; // Starts immediately after the spine panel
    const fcPanelY = 0;
    const fcPanelWidth = frontCoverWidthPx_trim + bleedPx; // Includes right bleed
    const fcPanelHeight = contentHeight;

    // Draw front cover background (e.g., white) - NO CLIP for background fill
    currentCtx.fillStyle = '#FFFFFF'; 
    currentCtx.fillRect(fcPanelX, fcPanelY, fcPanelWidth, fcPanelHeight);

    // Front Cover Image (now drawn to fill the entire front cover panel, including bleed)
    if (frontImage) {
        currentCtx.save(); // Save for front cover image clipping

        // Define the area for the image to fill (the entire front cover panel including bleed)
        const imageDestX = fcPanelX;
        const imageDestY = fcPanelY; // fcPanelY is 0, so image draws from the top canvas edge
        const imageDestWidth = fcPanelWidth; // fcPanelWidth includes the right bleed
        const imageDestHeight = fcPanelHeight; // fcPanelHeight is contentHeight, so includes top/bottom bleed

        currentCtx.beginPath();
        currentCtx.rect(imageDestX, imageDestY, imageDestWidth, imageDestHeight); // Clip to the full panel
        currentCtx.clip();

        const imgAspectRatio = frontImage.naturalWidth / frontImage.naturalHeight;
        // Aspect ratio of the destination area (the full front cover panel)
        const targetAspectRatio = imageDestWidth / imageDestHeight; 
        
        let sx = 0, sy = 0, sWidth = frontImage.naturalWidth, sHeight = frontImage.naturalHeight;
        
        if (imgAspectRatio > targetAspectRatio) { // Image is wider than target panel
            sHeight = frontImage.naturalHeight; 
            sWidth = sHeight * targetAspectRatio; 
            sx = (frontImage.naturalWidth - sWidth) / 2;
        } else if (imgAspectRatio < targetAspectRatio) { // Image is taller than target panel
            sWidth = frontImage.naturalWidth; 
            sHeight = sWidth / targetAspectRatio; 
            sy = (frontImage.naturalHeight - sHeight) / 2;
        }
        // Else, aspect ratios match, use full source image (sx, sy, sWidth, sHeight are already correct)

        currentCtx.drawImage(frontImage, sx, sy, sWidth, sHeight, 
                             imageDestX, imageDestY, imageDestWidth, imageDestHeight); // Draw to fill the panel
        currentCtx.restore(); // Restore from front cover image clipping
    } else {
        // Placeholder text if no image (drawn on top of the white background)
        // Positioned roughly in the center of the trim area of the front cover
        currentCtx.fillStyle = '#AAAAAA'; currentCtx.textAlign = 'center'; currentCtx.textBaseline = 'middle';
        currentCtx.fillText('Front Cover Area', fcPanelX + frontCoverWidthPx_trim / 2, bleedPx + coverHeightPx_trim / 2);
    }

    // --- 4. Draw Guidelines Overlay ---
    if (shouldDrawGuidelines && !exportTargetDPI) {
        currentCtx.save();
        currentCtx.lineWidth = 0.5; 
        currentCtx.setLineDash([3, 3]);
        currentCtx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
        currentCtx.beginPath(); currentCtx.moveTo(bleedPx, 0); currentCtx.lineTo(bleedPx, contentHeight); currentCtx.stroke();
        currentCtx.beginPath(); currentCtx.moveTo(bcPanelWidth, 0); currentCtx.lineTo(bcPanelWidth, contentHeight); currentCtx.stroke(); // Spine Fold 1 (right edge of back cover panel)
        currentCtx.beginPath(); currentCtx.moveTo(bcPanelWidth + sPanelWidth, 0); currentCtx.lineTo(bcPanelWidth + sPanelWidth, contentHeight); currentCtx.stroke(); // Spine Fold 2 (right edge of spine panel)
        currentCtx.beginPath(); currentCtx.moveTo(contentWidth - bleedPx, 0); currentCtx.lineTo(contentWidth - bleedPx, contentHeight); currentCtx.stroke(); // Right trim of front cover
        
        currentCtx.beginPath(); currentCtx.moveTo(0, bleedPx); currentCtx.lineTo(contentWidth, bleedPx); currentCtx.stroke(); // Top trim
        currentCtx.beginPath(); currentCtx.moveTo(0, contentHeight - bleedPx); currentCtx.lineTo(contentWidth, contentHeight - bleedPx); currentCtx.stroke(); // Bottom trim

        currentCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        const safeMarginCoverPx = inchToPx(SAFE_MARGIN_COVER_INCHES, ppiForDrawing);
        const safeMarginSpinePx = inchToPx(SAFE_MARGIN_SPINE_INCHES, ppiForDrawing);
        // Back Safe Area (relative to its trim box)
        currentCtx.strokeRect(bleedPx + safeMarginCoverPx, bleedPx + safeMarginCoverPx, backCoverWidthPx_trim - (2 * safeMarginCoverPx), coverHeightPx_trim - (2 * safeMarginCoverPx));
        // Spine Safe Area (relative to its trim box)
        currentCtx.strokeRect(sPanelX + safeMarginSpinePx, bleedPx + safeMarginCoverPx, sPanelWidth - (2 * safeMarginSpinePx), coverHeightPx_trim - (2 * safeMarginCoverPx));
        // Front Safe Area (relative to its trim box)
        currentCtx.strokeRect(fcPanelX + safeMarginCoverPx, bleedPx + safeMarginCoverPx, frontCoverWidthPx_trim - (2 * safeMarginCoverPx), coverHeightPx_trim - (2 * safeMarginCoverPx));
        currentCtx.restore();
    }

    if (applyTransform && !exportTargetDPI) { // Restore from outer zoom/pan transform if it was applied
      currentCtx.restore(); 
    }
  }, [scale, offset]); // Dependencies for useCallback - scale and offset are for preview transform

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    // Only render when fonts are loaded (or we're using system fonts)
    if (!fontsLoaded) return;
    
    const currentSpineWidthMM = getCalculatedSpineWidth();

    drawCover(
        ctx, 
        canvas, 
        true, 
        bookDetails, 
        designData, 
        currentSpineWidthMM, 
        loadedFrontCoverImage, // Pass the loaded image state 
        loadedAIBackCoverImage, // Pass the loaded image state
        true, // Always draw guidelines for live preview (can be changed by a UI toggle later)
        null // No export DPI for live preview
    );
  }, [
    bookDetails, 
    designData, 
    getCalculatedSpineWidth, 
    loadedFrontCoverImage, 
    loadedAIBackCoverImage,
    scale, 
    offset,
    drawCover,
    fontsLoaded // Add fonts loaded dependency
  ]);

  useEffect(() => {
    // This effect handles loading the image and managing its object URL
    let newObjectUrl: string | null = null;

    if (typeof coverImage === 'string' && coverImage) {
      // coverImage is now always a string (blob URL, data URL, or external URL)
      // We use it directly for the image source
      newObjectUrl = coverImage;
    }

    // If there was a previous object URL (blob), revoke it before setting a new one or clearing
    if (currentFrontCoverObjectUrl && currentFrontCoverObjectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentFrontCoverObjectUrl);
    }
    setCurrentFrontCoverObjectUrl(newObjectUrl); // Store the new URL (blob or other)

    if (newObjectUrl) {
      const img = new Image();
      img.onload = () => {
        setLoadedFrontCoverImage(img);
      };
      img.onerror = () => {
        console.error('Error loading user-uploaded front cover image.');
        setLoadedFrontCoverImage(null);
      };
      // For externally hosted images, CORS issues can prevent loading into canvas
      // if the server doesn't send appropriate CORS headers.
      // For S3/Blob storage, ensure CORS is configured if images are served directly.
      if (newObjectUrl.startsWith('http')) { // Basic check for external URL
        img.crossOrigin = "Anonymous";
      }
      img.src = newObjectUrl;
    } else {
      setLoadedFrontCoverImage(null); // Clear image if no coverImage or newObjectUrl
    }

    // Cleanup function: This will be called when the component unmounts
    // or before the effect runs again if `coverImage` changes.
    return () => {
      if (newObjectUrl && newObjectUrl.startsWith('blob:')) {
        // Revoke the specific object URL created in this effect run
        URL.revokeObjectURL(newObjectUrl);
      }
      // The `currentFrontCoverObjectUrl` (which was the `newObjectUrl` of a previous run)
      // would have already been revoked at the start of this effect run if it was a blob.
    };
  }, [coverImage, currentFrontCoverObjectUrl]); // Include currentFrontCoverObjectUrl to satisfy ESLint

  useEffect(() => {
    const aiImageUrl = designData.backCoverAIImageURL;
    console.log('CoverPreview: backCoverAIImageURL from store:', aiImageUrl); 
    if (aiImageUrl && aiImageUrl !== currentAIBackCoverImageUrl) {
      setCurrentAIBackCoverImageUrl(aiImageUrl);
      
      const img = new Image();
      img.onload = () => {
        console.log('CoverPreview: AI back cover image loaded successfully VIA PROXY'); 
        setLoadedAIBackCoverImage(img);
      };
      img.onerror = () => {
        console.error('CoverPreview: Error loading AI-generated back cover image VIA PROXY.'); 
        setLoadedAIBackCoverImage(null);
      };
      // No crossOrigin attribute needed when fetching from own backend proxy
      // img.crossOrigin = "Anonymous"; 
      img.src = `/api/image-proxy?url=${encodeURIComponent(aiImageUrl)}`; // Use the proxy
    } else if (!aiImageUrl && currentAIBackCoverImageUrl) { 
      setLoadedAIBackCoverImage(null);
      setCurrentAIBackCoverImageUrl(null);
      console.log('CoverPreview: Cleared AI back cover image and URL'); 
    }
  }, [designData.backCoverAIImageURL, currentAIBackCoverImageUrl]);

  // Ref for the container div to attach native event listener
  const containerRef = useRef<HTMLDivElement>(null);

  // Event handlers for zoom and pan
  const handleWheelZoom = useCallback((event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX_viewport = event.clientX - rect.left;
    const mouseY_viewport = event.clientY - rect.top;
    const worldX = (mouseX_viewport - offset.x) / scale;
    const worldY = (mouseY_viewport - offset.y) / scale;
    let newScale = scale - event.deltaY * 0.001;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    const newOffsetX = mouseX_viewport - worldX * newScale;
    const newOffsetY = mouseY_viewport - worldY * newScale;
    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [scale, offset]);

  // Add native wheel event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheelZoom, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheelZoom);
    };
  }, [handleWheelZoom]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsPanning(true);
    setPanStart({ x: event.clientX - offset.x, y: event.clientY - offset.y });
    if (event.currentTarget) event.currentTarget.style.cursor = 'grabbing';
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    event.preventDefault();
    const newOffsetX = event.clientX - panStart.x;
    const newOffsetY = event.clientY - panStart.y;
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleMouseUpOrLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
      if (event.currentTarget) event.currentTarget.style.cursor = 'grab';
    }
  };

  // Server-side export functions
  const [isExporting, setIsExporting] = useState(false);

  const handleServerExport = async (format: 'png' | 'pdf') => {
    if (!session) {
      alert('Please sign in to use server-side exports');
      return;
    }

    if (isExporting) return;

    // Track export attempt
    analytics.trackExport(format, format === 'png' ? 3 : 5, session.user?.email || undefined);

    setIsExporting(true);
    try {
      const exportData = {
        projectId: currentProjectId,
        format,
        dpi: 300,
        bookDetails,
        designData,
        coverImageUrl: coverImage,
        aiBackImageUrl: designData.backCoverAIImageURL
      };

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        const error = await response.json();
        analytics.trackError(`Export failed: ${error.error}`, 'export', session.user?.email || undefined);
        throw new Error(error.error || 'Export failed');
      }

      // Track successful export
      analytics.trackUserAction('export_success', 'export', format, session.user?.email || undefined);

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `cover_export_300dpi.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Server export error:', error);
      analytics.trackError(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'export', session.user?.email || undefined);
      alert(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleServerExportPNG = () => handleServerExport('png');
  const handleServerExportPDF = () => handleServerExport('pdf');

  return (
    <div className="w-full flex flex-col items-center p-4 border border-gray-300 rounded-md overflow-hidden">
      <h3 className="text-lg font-semibold mb-2">Live Preview</h3>
      {!fontsLoaded && (
        <div className="w-full mb-2 bg-blue-50 border border-blue-200 rounded-md p-2">
          <div className="flex items-center justify-between text-sm text-blue-700">
            <span>Loading fonts...</span>
            <span>{Math.round(loadingProgress)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      <div 
        ref={containerRef}
        className="canvas-container w-full relative cursor-grab"
        style={{
          aspectRatio: `${(bookDetails.trimSize.split('x').map(Number)[0]*2 + mmToPx(getCalculatedSpineWidth())/RENDER_PPI + BLEED_INCHES*2) || 12} / ${(bookDetails.trimSize.split('x').map(Number)[1] + BLEED_INCHES*2) || 9}`,
          overflow: 'hidden' 
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <canvas 
          ref={canvasRef} 
          className="border border-gray-400 shadow-lg absolute top-0 left-0"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => setScale(s => Math.max(MIN_SCALE, s - 0.1))} className="px-2 py-1 bg-gray-200 rounded">Zoom Out</button>
        <button onClick={() => setScale(s => Math.min(MAX_SCALE, s + 0.1))} className="px-2 py-1 bg-gray-200 rounded">Zoom In</button>
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="px-2 py-1 bg-gray-200 rounded">Reset</button>
        
        {/* Production-quality exports */}
        <div className="flex space-x-2">
          <button 
            onClick={handleServerExportPNG} 
            disabled={isExporting || !session}
            className={`px-3 py-2 text-white rounded font-medium ${
              isExporting || !session 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isExporting ? 'Exporting...' : 'Export PNG (3 credits)'}
          </button>
          <button 
            onClick={handleServerExportPDF}
            disabled={isExporting || !session}
            className={`px-3 py-2 text-white rounded font-medium ${
              isExporting || !session 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isExporting ? 'Exporting...' : 'Export PDF (5 credits)'}
          </button>
        </div>
      </div>
    </div>
  );
} 