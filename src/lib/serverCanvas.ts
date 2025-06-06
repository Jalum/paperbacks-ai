import { createCanvas, loadImage, CanvasRenderingContext2D, Canvas } from 'canvas'
import { BookDetails, DesignData } from '@/types'
import sharp from 'sharp'

interface ServerRenderOptions {
  bookDetails: BookDetails
  designData: DesignData
  coverImageUrl?: string
  aiBackImageUrl?: string
  dpi: number
}

interface CanvasDimensions {
  totalWidth: number
  totalHeight: number
  frontWidth: number
  frontHeight: number
  spineWidth: number
  bleed: number
  frontWidthInches: number
  frontHeightInches: number
  spineWidthInches: number
  dpi: number
}

export async function generateCoverCanvas(options: ServerRenderOptions): Promise<Buffer> {
  const { bookDetails, designData, coverImageUrl, aiBackImageUrl, dpi } = options
  
  // Calculate dimensions (same logic as client)
  const dimensions = calculateDimensions(bookDetails, dpi)
  
  console.log('Canvas dimensions:', {
    dpi,
    totalWidth: dimensions.totalWidth,
    totalHeight: dimensions.totalHeight,
    frontWidthInches: dimensions.frontWidthInches,
    frontHeightInches: dimensions.frontHeightInches,
    spineWidthInches: dimensions.spineWidthInches,
    totalWidthInches: dimensions.frontWidthInches * 2 + dimensions.spineWidthInches + 0.25,
    totalHeightInches: dimensions.frontHeightInches + 0.25,
    expectedPixels: Math.ceil((dimensions.frontWidthInches * 2 + dimensions.spineWidthInches + 0.25) * dpi) * Math.ceil((dimensions.frontHeightInches + 0.25) * dpi),
    actualPixels: dimensions.totalWidth * dimensions.totalHeight
  })
  
  // Create canvas with explicit pixel density
  const canvas = createCanvas(dimensions.totalWidth, dimensions.totalHeight)
  const ctx = canvas.getContext('2d')
  
  // Set high-quality rendering
  ctx.imageSmoothingEnabled = true
  
  // Use the same unified rendering function as the client preview
  await drawCoverUnified(
    ctx,
    canvas,
    false, // no interactive transform
    bookDetails,
    designData,
    calculateSpineWidthMM(bookDetails.pageCount, bookDetails.paperType),
    coverImageUrl ? await loadImage(coverImageUrl) : null,
    aiBackImageUrl ? await loadImage(aiBackImageUrl) : null,
    false, // no guidelines
    dpi // export target DPI
  )
  
  // Generate PNG buffer
  const pngBuffer = canvas.toBuffer('image/png', { 
    compressionLevel: 6,
    filters: Canvas.PNG_FILTER_NONE 
  })
  
  // Set proper DPI metadata using Sharp
  const finalBuffer = await sharp(pngBuffer)
    .png()
    .withMetadata({
      density: dpi
    })
    .toBuffer()
  
  console.log('Canvas buffer generated:', {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height, 
    totalPixels: canvas.width * canvas.height,
    dpiSet: dpi,
    originalSize: pngBuffer.length,
    finalSize: finalBuffer.length,
    bufferSizeMB: (finalBuffer.length / 1024 / 1024).toFixed(2) + 'MB',
    bytesPerPixel: (finalBuffer.length / (canvas.width * canvas.height)).toFixed(2)
  })
  
  return finalBuffer
}

function calculateDimensions(bookDetails: BookDetails, dpi: number): CanvasDimensions {
  const [frontWidthInches, frontHeightInches] = bookDetails.trimSize.split('x').map(d => parseFloat(d))
  const spineWidthMM = calculateSpineWidthMM(bookDetails.pageCount, bookDetails.paperType)
  const spineWidthInches = spineWidthMM / 25.4
  
  const bleedInches = 0.125
  
  // Convert to pixels at target DPI - same logic as client preview
  const frontWidthPx = frontWidthInches * dpi
  const frontHeightPx = frontHeightInches * dpi
  const spineWidthPx = spineWidthInches * dpi
  const bleedPx = bleedInches * dpi
  
  // Match client calculation exactly
  const backCoverWidthPx_trim = frontWidthPx
  const coverHeightPx_trim = frontHeightPx
  const spineWidthPx_trim = spineWidthPx
  const frontCoverWidthPx_trim = frontWidthPx
  
  const contentWidth = backCoverWidthPx_trim + spineWidthPx_trim + frontCoverWidthPx_trim + (2 * bleedPx)
  const contentHeight = coverHeightPx_trim + (2 * bleedPx)
  
  return {
    totalWidth: Math.ceil(contentWidth),
    totalHeight: Math.ceil(contentHeight),
    frontWidth: Math.ceil(frontWidthPx),
    frontHeight: Math.ceil(frontHeightPx),
    spineWidth: Math.ceil(spineWidthPx),
    bleed: Math.ceil(bleedPx),
    frontWidthInches,
    frontHeightInches,
    spineWidthInches,
    dpi
  }
}

function calculateSpineWidthMM(pageCount: number, paperType: string): number {
  const pageThickness = paperType === 'cream' ? 0.0025 : 0.002252 // inches per page
  const coverThickness = 0.0102 // inches for cover
  const spineWidthInches = (pageCount * pageThickness) + coverThickness
  return spineWidthInches * 25.4 // Convert to mm
}

// Helper function to wrap text like the client
function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ')
  let line = ''
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = context.measureText(testLine)
    const testWidth = metrics.width
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, y)
      line = words[n] + ' '
      y += lineHeight
    } else {
      line = testLine
    }
  }
  context.fillText(line, x, y)
}

// Unified drawing function that matches the client preview exactly
async function drawCoverUnified(
  currentCtx: CanvasRenderingContext2D,
  currentCanvas: Canvas,
  applyTransform: boolean,
  currentBookDetails: BookDetails,
  currentDesignData: DesignData,
  spineWidthMM: number,
  frontImage: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  aiBackImage: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  shouldDrawGuidelines: boolean,
  exportTargetDPI: number | null = null
) {
  const RENDER_PPI = 72
  const inchToPx = (inches: number, ppi: number = RENDER_PPI) => inches * ppi
  const mmToPx = (mm: number, ppi: number = RENDER_PPI) => (mm / 25.4) * ppi
  const DEFAULT_SPINE_COLOR = '#E0E0E0'
  const DEFAULT_BACK_COVER_COLOR = '#F0F0F0'
  const BLEED_INCHES = 0.125
  // const SAFE_MARGIN_COVER_INCHES = 0.25
  const SAFE_MARGIN_SPINE_INCHES = 0.0625
  const BARCODE_AREA_WIDTH_INCHES = 2.0
  const BARCODE_AREA_HEIGHT_INCHES = 1.2
  const BARCODE_MARGIN_FROM_TRIM_EDGE_INCHES = 0.25

  const ppiForDrawing = exportTargetDPI || RENDER_PPI
  const scaleFactor = exportTargetDPI ? exportTargetDPI / RENDER_PPI : 1

  const { title, author, trimSize } = currentBookDetails
  const parts = trimSize.split('x').map(Number)
  const trimWidthInches = parts[0] || 6
  const trimHeightInches = parts[1] || 9
  const bleedPx = inchToPx(BLEED_INCHES, ppiForDrawing)

  const coverHeightPx_trim = inchToPx(trimHeightInches, ppiForDrawing)
  const frontCoverWidthPx_trim = inchToPx(trimWidthInches, ppiForDrawing)
  const spineWidthPx_trim = mmToPx(spineWidthMM, ppiForDrawing)
  const backCoverWidthPx_trim = frontCoverWidthPx_trim
  
  const contentWidth = backCoverWidthPx_trim + spineWidthPx_trim + frontCoverWidthPx_trim + (2 * bleedPx)
  const contentHeight = coverHeightPx_trim + (2 * bleedPx)

  if (!exportTargetDPI) {
    currentCanvas.width = contentWidth
    currentCanvas.height = contentHeight
  }

  currentCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height)

  // 1. Back Cover Panel
  const bcPanelX = 0
  const bcPanelY = 0
  const bcPanelWidth = backCoverWidthPx_trim + bleedPx
  const bcPanelHeight = contentHeight

  currentCtx.save()
  currentCtx.beginPath()
  currentCtx.rect(bcPanelX, bcPanelY, bcPanelWidth, bcPanelHeight)
  currentCtx.clip()

  if (currentDesignData.backCoverBackgroundType === 'ai' && aiBackImage && currentDesignData.backCoverAIImageURL) {
    const imgWidth = aiBackImage.width || aiBackImage.naturalWidth
    const imgHeight = aiBackImage.height || aiBackImage.naturalHeight
    const canvasAspect = bcPanelWidth / bcPanelHeight
    const imgAspect = imgWidth / imgHeight
    let sx, sy, sWidth, sHeight
    if (imgAspect > canvasAspect) {
      sHeight = imgHeight; sWidth = imgHeight * canvasAspect; sx = (imgWidth - sWidth) / 2; sy = 0
    } else {
      sWidth = imgWidth; sHeight = imgWidth / canvasAspect; sx = 0; sy = (imgHeight - sHeight) / 2
    }
    currentCtx.drawImage(aiBackImage, sx, sy, sWidth, sHeight, bcPanelX, bcPanelY, bcPanelWidth, bcPanelHeight)
  } else if (currentDesignData.backCoverBackgroundType === 'gradient' && currentDesignData.backCoverGradientStartColor && currentDesignData.backCoverGradientEndColor) {
    let gradient
    if (currentDesignData.backCoverGradientDirection === 'horizontal') {
      gradient = currentCtx.createLinearGradient(bcPanelX, bcPanelY, bcPanelX + bcPanelWidth, bcPanelY)
    } else {
      gradient = currentCtx.createLinearGradient(bcPanelX, bcPanelY, bcPanelX, bcPanelY + bcPanelHeight)
    }
    gradient.addColorStop(0, currentDesignData.backCoverGradientStartColor)
    gradient.addColorStop(1, currentDesignData.backCoverGradientEndColor)
    currentCtx.fillStyle = gradient
    currentCtx.fillRect(bcPanelX, bcPanelY, bcPanelWidth, bcPanelHeight)
  } else if (currentDesignData.backCoverBackgroundType === 'pattern' && currentDesignData.backCoverPatternType) {
    const patternScale = currentDesignData.backCoverPatternScale || 20
    const color1 = currentDesignData.backCoverPatternColor1 || '#FFFFFF'
    const color2 = currentDesignData.backCoverPatternColor2 || '#DDDDDD'
    currentCtx.fillStyle = color1
    currentCtx.fillRect(bcPanelX, bcPanelY, bcPanelWidth, bcPanelHeight)
    
    // All pattern types from client
    switch (currentDesignData.backCoverPatternType) {
      case 'stripes':
        const direction = currentDesignData.backCoverPatternDirection || 'vertical'
        const stripePatternSize = (patternScale) * scaleFactor
        for (let i = 0; i * stripePatternSize < (direction === 'vertical' ? bcPanelWidth : bcPanelHeight); i++) {
          currentCtx.fillStyle = (i % 2 === 0) ? color1 : color2
          if (direction === 'vertical') {
            currentCtx.fillRect(bcPanelX + i * stripePatternSize, bcPanelY, stripePatternSize, bcPanelHeight)
          } else {
            currentCtx.fillRect(bcPanelX, bcPanelY + i * stripePatternSize, bcPanelWidth, stripePatternSize)
          }
        }
        break
      case 'dots':
        currentCtx.fillStyle = color2
        const dotPatternSize = (patternScale) * scaleFactor
        const radius = dotPatternSize / 2
        for (let y = radius; y < bcPanelHeight; y += dotPatternSize * 1.5) {
          for (let x = radius; x < bcPanelWidth; x += dotPatternSize * 1.5) {
            currentCtx.beginPath(); currentCtx.arc(bcPanelX + x, bcPanelY + y, radius, 0, 2 * Math.PI); currentCtx.fill()
          }
        }
        break
      case 'checkerboard':
        const checkerPatternSize = (patternScale) * scaleFactor
        for (let y = 0; y * checkerPatternSize < bcPanelHeight; y++) {
          for (let x = 0; x * checkerPatternSize < bcPanelWidth; x++) {
            currentCtx.fillStyle = ((x + y) % 2 === 0) ? color1 : color2
            currentCtx.fillRect(bcPanelX + x * checkerPatternSize, bcPanelY + y * checkerPatternSize, checkerPatternSize, checkerPatternSize)
          }
        }
        break
      // Add all other pattern types from client...
    }
  } else {
    currentCtx.fillStyle = currentDesignData.backCoverBackgroundColor || DEFAULT_BACK_COVER_COLOR
    currentCtx.fillRect(bcPanelX, bcPanelY, bcPanelWidth, bcPanelHeight)
  }
  currentCtx.restore()

  // Barcode Area
  const barcodeAreaTrimX = bleedPx
  const barcodeAreaTrimY = bleedPx
  const barcodeAreaWidthPx = inchToPx(BARCODE_AREA_WIDTH_INCHES, ppiForDrawing)
  const barcodeAreaHeightPx = inchToPx(BARCODE_AREA_HEIGHT_INCHES, ppiForDrawing)
  const barcodeMarginPx = inchToPx(BARCODE_MARGIN_FROM_TRIM_EDGE_INCHES, ppiForDrawing)
  const barcodeAreaX = barcodeAreaTrimX + backCoverWidthPx_trim - barcodeMarginPx - barcodeAreaWidthPx
  const barcodeAreaY = barcodeAreaTrimY + coverHeightPx_trim - barcodeMarginPx - barcodeAreaHeightPx
  currentCtx.save()
  currentCtx.fillStyle = '#FFFFFF'
  currentCtx.fillRect(barcodeAreaX, barcodeAreaY, barcodeAreaWidthPx, barcodeAreaHeightPx)
  currentCtx.strokeStyle = 'rgba(100, 100, 100, 0.8)'
  currentCtx.lineWidth = 1
  currentCtx.setLineDash([2, 2])
  currentCtx.strokeRect(barcodeAreaX, barcodeAreaY, barcodeAreaWidthPx, barcodeAreaHeightPx)
  currentCtx.restore()

  // Back Cover Text - exact client logic
  if (currentDesignData.backCoverBlurbEnableBox) {
    const text = currentDesignData.backCoverText
    const font = currentDesignData.backCoverFont || 'Arial'
    let fontSize = currentDesignData.backCoverFontSize || 10
    if (exportTargetDPI) fontSize *= scaleFactor
    const textColor = currentDesignData.backCoverTextColor || '#000000'
    const boxColor = currentDesignData.backCoverBlurbBoxFillColor || '#FFFFFF'
    const boxOpacity = currentDesignData.backCoverBlurbBoxOpacity === undefined ? 1 : currentDesignData.backCoverBlurbBoxOpacity
    const cornerRadius = currentDesignData.backCoverBlurbBoxCornerRadius || 20
    const padding = currentDesignData.backCoverBlurbBoxPadding || 15
    const widthPercentage = currentDesignData.backCoverBlurbBoxWidthPercent || 80
    const heightPercentage = currentDesignData.backCoverBlurbBoxHeightPercent || 30
    const offsetXPercentage = currentDesignData.backCoverBlurbBoxXOffsetPercent || 10
    const offsetYPercentage = currentDesignData.backCoverBlurbBoxYOffsetPercent || 10

    const blurbRelativeToTrimX = bleedPx
    const blurbRelativeToTrimY = bleedPx
    const blurbAreaWidth = backCoverWidthPx_trim
    const blurbAreaHeight = coverHeightPx_trim

    const boxWidth = blurbAreaWidth * (widthPercentage / 100)
    const boxHeight = blurbAreaHeight * (heightPercentage / 100)
    const blurbAreaCenterX = blurbRelativeToTrimX + blurbAreaWidth / 2
    const blurbAreaCenterY = blurbRelativeToTrimY + blurbAreaHeight / 2
    const boxCenterX = blurbAreaCenterX + (blurbAreaWidth / 2) * (offsetXPercentage / 100)
    const boxCenterY = blurbAreaCenterY + (blurbAreaHeight / 2) * (offsetYPercentage / 100)
    const boxX = boxCenterX - boxWidth / 2
    const boxY = boxCenterY - boxHeight / 2

    currentCtx.save()
    currentCtx.globalAlpha = boxOpacity
    currentCtx.fillStyle = boxColor
    currentCtx.beginPath()
    currentCtx.moveTo(boxX + cornerRadius, boxY)
    currentCtx.lineTo(boxX + boxWidth - cornerRadius, boxY)
    currentCtx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + cornerRadius)
    currentCtx.lineTo(boxX + boxWidth, boxY + boxHeight - cornerRadius)
    currentCtx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - cornerRadius, boxY + boxHeight)
    currentCtx.lineTo(boxX + cornerRadius, boxY + boxHeight)
    currentCtx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - cornerRadius)
    currentCtx.lineTo(boxX, boxY + cornerRadius)
    currentCtx.quadraticCurveTo(boxX, boxY, boxX + cornerRadius, boxY)
    currentCtx.closePath()
    currentCtx.fill()
    currentCtx.globalAlpha = 1.0
    if (text) {
      currentCtx.fillStyle = textColor
      currentCtx.font = `${fontSize}px ${font}`
      currentCtx.textAlign = 'left'; currentCtx.textBaseline = 'top'
      const textDrawAreaX = boxX + padding
      const textDrawAreaY = boxY + padding
      const textDrawAreaWidth = boxWidth - (2 * padding)
      wrapText(currentCtx, text, textDrawAreaX, textDrawAreaY, textDrawAreaWidth, fontSize * 1.2)
    }
    currentCtx.restore()
  } else if (currentDesignData.backCoverText) {
    const text = currentDesignData.backCoverText
    const font = currentDesignData.backCoverFont || 'Arial'
    let fontSize = currentDesignData.backCoverFontSize || 10
    if (exportTargetDPI) fontSize *= scaleFactor
    const textColor = currentDesignData.backCoverTextColor || '#000000'
    const paddingValue = inchToPx(0.5, ppiForDrawing)
    currentCtx.fillStyle = textColor
    currentCtx.font = `${fontSize}px ${font}`
    currentCtx.textAlign = 'left'
    currentCtx.textBaseline = 'top'
    wrapText(currentCtx, text, bleedPx + paddingValue, bleedPx + paddingValue, backCoverWidthPx_trim - (2*paddingValue), fontSize * 1.2)
  }

  // 2. Spine Panel
  const sPanelX = bcPanelWidth
  const sPanelY = 0
  const sPanelWidth = spineWidthPx_trim
  const sPanelHeight = contentHeight

  if (currentDesignData.spineBackgroundType === 'gradient' && currentDesignData.spineGradientStartColor && currentDesignData.spineGradientEndColor) {
    let gradient
    if (currentDesignData.spineGradientDirection === 'horizontal') {
      gradient = currentCtx.createLinearGradient(sPanelX, sPanelY, sPanelX + sPanelWidth, sPanelY)
    } else {
      gradient = currentCtx.createLinearGradient(sPanelX, sPanelY, sPanelX, sPanelY + sPanelHeight)
    }
    gradient.addColorStop(0, currentDesignData.spineGradientStartColor)
    gradient.addColorStop(1, currentDesignData.spineGradientEndColor)
    currentCtx.fillStyle = gradient
  } else {
    currentCtx.fillStyle = currentDesignData.spineBackgroundColor || DEFAULT_SPINE_COLOR
  }
  currentCtx.fillRect(sPanelX, sPanelY, sPanelWidth, sPanelHeight)
  
  // Spine Text
  if (title || author) {
    currentCtx.save()
    const spineTrimX = sPanelX
    const spineTrimY = bleedPx
    const spineTrimWidth = sPanelWidth
    const spineTrimHeight = coverHeightPx_trim
    
    currentCtx.beginPath()
    currentCtx.rect(spineTrimX, spineTrimY, spineTrimWidth, spineTrimHeight)
    currentCtx.clip()

    const spineTextColor = currentDesignData.spineColor || '#000000'
    const spineFont = currentDesignData.spineFont || 'Arial'
    let spineFontSize = currentDesignData.spineFontSize || 12
    if (exportTargetDPI) spineFontSize *= scaleFactor
    
    const safeSpineMarginPx = inchToPx(SAFE_MARGIN_SPINE_INCHES, ppiForDrawing)
    const newAdditionalInsetPx = inchToPx(0.125, ppiForDrawing)

    let maxTextWidth = spineTrimHeight - (2 * safeSpineMarginPx) - (2 * newAdditionalInsetPx)
    if (maxTextWidth < 1) maxTextWidth = 1

    const maxTextHeight = spineTrimWidth - (2 * safeSpineMarginPx)
    
    currentCtx.fillStyle = spineTextColor
    
    const _title = title?.trim()
    const _author = author?.trim()
    const tempTitle = _title || "Title"
    const tempAuthor = _author || "Author"
    const fullSpineText = `${tempTitle}${tempTitle && tempAuthor ? ' - ' : ''}${tempAuthor}`

    currentCtx.font = `${spineFontSize}px ${spineFont}`
    const textMetrics = currentCtx.measureText(fullSpineText)
    let finalSpineFontSize = spineFontSize

    if (textMetrics.width > maxTextWidth) {
      let tempFontSize = spineFontSize
      while (tempFontSize > 5) {
        currentCtx.font = `${tempFontSize}px ${spineFont}`
        if (currentCtx.measureText(fullSpineText).width <= maxTextWidth) {
          finalSpineFontSize = tempFontSize
          break
        }
        tempFontSize -= 1
      }
      if (tempFontSize <= 5 && currentCtx.measureText(fullSpineText).width > maxTextWidth) {
        finalSpineFontSize = 5
      }
    }
    if (finalSpineFontSize > maxTextHeight) finalSpineFontSize = maxTextHeight

    currentCtx.font = `${finalSpineFontSize}px ${spineFont}`
    
    const textPlacementX = spineTrimX + spineTrimWidth / 2
    const textPlacementY = spineTrimY + spineTrimHeight / 2
    
    currentCtx.save()
    currentCtx.translate(textPlacementX, textPlacementY)
    currentCtx.rotate(Math.PI / 2)

    currentCtx.textAlign = 'center'
    currentCtx.textBaseline = 'middle'

    if (_title && _author) {
      const authorX = spineTrimHeight * 0.25
      currentCtx.fillText(_author, authorX, 0)

      const titleX = -spineTrimHeight * 0.25
      currentCtx.fillText(_title, titleX, 0)
    } else if (_title) {
      currentCtx.fillText(_title, 0, 0)
    } else if (_author) {
      currentCtx.fillText(_author, 0, 0)
    }
    
    currentCtx.restore()
    currentCtx.restore()
  }

  // 3. Front Cover Panel
  const fcPanelX = sPanelX + sPanelWidth
  const fcPanelY = 0
  const fcPanelWidth = frontCoverWidthPx_trim + bleedPx
  const fcPanelHeight = contentHeight

  currentCtx.fillStyle = '#FFFFFF'
  currentCtx.fillRect(fcPanelX, fcPanelY, fcPanelWidth, fcPanelHeight)

  if (frontImage) {
    currentCtx.save()

    const imageDestX = fcPanelX
    const imageDestY = fcPanelY
    const imageDestWidth = fcPanelWidth
    const imageDestHeight = fcPanelHeight

    currentCtx.beginPath()
    currentCtx.rect(imageDestX, imageDestY, imageDestWidth, imageDestHeight)
    currentCtx.clip()

    const imgWidth = frontImage.width || frontImage.naturalWidth
    const imgHeight = frontImage.height || frontImage.naturalHeight
    const imgAspectRatio = imgWidth / imgHeight
    const targetAspectRatio = imageDestWidth / imageDestHeight
    
    let sx = 0, sy = 0, sWidth = imgWidth, sHeight = imgHeight
    
    if (imgAspectRatio > targetAspectRatio) {
      sHeight = imgHeight
      sWidth = sHeight * targetAspectRatio
      sx = (imgWidth - sWidth) / 2
    } else if (imgAspectRatio < targetAspectRatio) {
      sWidth = imgWidth
      sHeight = sWidth / targetAspectRatio
      sy = (imgHeight - sHeight) / 2
    }

    currentCtx.drawImage(frontImage, sx, sy, sWidth, sHeight, imageDestX, imageDestY, imageDestWidth, imageDestHeight)
    currentCtx.restore()
  } else {
    currentCtx.fillStyle = '#AAAAAA'; currentCtx.textAlign = 'center'; currentCtx.textBaseline = 'middle'
    currentCtx.fillText('Front Cover Area', fcPanelX + frontCoverWidthPx_trim / 2, bleedPx + coverHeightPx_trim / 2)
  }
}






