import { BookDetails, DesignData } from '@/types'

interface RenderOptions {
  bookDetails: BookDetails
  designData: DesignData
  coverImageUrl?: string
  aiBackImageUrl?: string
  dpi: number
}

export async function generateCoverHTML(options: RenderOptions): Promise<string> {
  const { bookDetails, designData, coverImageUrl, aiBackImageUrl, dpi } = options
  
  // Calculate dimensions
  const dimensions = calculateDimensions(bookDetails, dpi)
  const styles = generateStyles(dimensions, designData, coverImageUrl, aiBackImageUrl)
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Book Cover Export</title>
      ${generateFontImports(designData)}
      <style>
        ${styles}
      </style>
    </head>
    <body>
      <div class="cover-container">
        ${generateCoverStructure(dimensions, bookDetails, designData)}
      </div>
    </body>
    </html>
  `
}

function calculateDimensions(bookDetails: BookDetails, dpi: number) {
  const [frontWidthInches, frontHeightInches] = bookDetails.trimSize.split('x').map(d => parseFloat(d))
  const spineWidthMM = calculateSpineWidthMM(bookDetails.pageCount, bookDetails.paperType)
  const spineWidthInches = spineWidthMM / 25.4
  
  const bleedInches = 0.125
  
  // Convert to pixels at target DPI
  const frontWidthPx = frontWidthInches * dpi
  const frontHeightPx = frontHeightInches * dpi
  const spineWidthPx = spineWidthInches * dpi
  const bleedPx = bleedInches * dpi
  
  const totalWidthPx = (frontWidthPx * 2) + spineWidthPx + (bleedPx * 2)
  const totalHeightPx = frontHeightPx + (bleedPx * 2)
  
  return {
    totalWidth: totalWidthPx,
    totalHeight: totalHeightPx,
    frontWidth: frontWidthPx,
    frontHeight: frontHeightPx,
    spineWidth: spineWidthPx,
    bleed: bleedPx,
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

function generateFontImports(designData: DesignData): string {
  const fonts = new Set<string>()
  
  // Extract font families and convert to Google Fonts URLs
  const spineFont = extractFontFamily(designData.spineFont)
  const backCoverFont = extractFontFamily(designData.backCoverFont)
  
  if (spineFont && spineFont !== 'Arial') fonts.add(spineFont)
  if (backCoverFont && backCoverFont !== 'Arial') fonts.add(backCoverFont)
  
  if (fonts.size === 0) return ''
  
  const fontList = Array.from(fonts).map(font => 
    font.replace(/\s+/g, '+') + ':400,700'
  ).join('&family=')
  
  return `<link href="https://fonts.googleapis.com/css2?family=${fontList}&display=swap" rel="stylesheet">`
}

function extractFontFamily(fontString?: string): string | null {
  if (!fontString) return null
  
  // Extract font family from CSS font string (e.g., "Inter, sans-serif" -> "Inter")
  const match = fontString.match(/^([^,]+)/)
  return match ? match[1].trim().replace(/['"]/g, '') : null
}

interface Dimensions {
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

function generateStyles(
  dimensions: Dimensions, 
  designData: DesignData, 
  coverImageUrl?: string, 
  aiBackImageUrl?: string
): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      background: white;
    }
    
    .cover-container {
      position: relative;
      width: ${dimensions.totalWidth}px;
      height: ${dimensions.totalHeight}px;
      background: white;
      overflow: hidden;
    }
    
    .bleed-area {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    
    .trim-area {
      position: absolute;
      top: ${dimensions.bleed}px;
      left: ${dimensions.bleed}px;
      width: ${dimensions.totalWidth - (dimensions.bleed * 2)}px;
      height: ${dimensions.totalHeight - (dimensions.bleed * 2)}px;
    }
    
    .back-cover {
      position: absolute;
      top: 0;
      left: 0;
      width: ${dimensions.frontWidth}px;
      height: ${dimensions.frontHeight}px;
      ${generateBackCoverStyles(designData, aiBackImageUrl)}
    }
    
    .spine {
      position: absolute;
      top: 0;
      left: ${dimensions.frontWidth}px;
      width: ${dimensions.spineWidth}px;
      height: ${dimensions.frontHeight}px;
      ${generateSpineStyles(designData)}
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .front-cover {
      position: absolute;
      top: 0;
      left: ${dimensions.frontWidth + dimensions.spineWidth}px;
      width: ${dimensions.frontWidth}px;
      height: ${dimensions.frontHeight}px;
      ${coverImageUrl ? `background-image: url('${coverImageUrl}');` : 'background: #f0f0f0;'}
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
    
    .spine-text {
      ${generateSpineTextStyles(designData, dimensions)}
      white-space: nowrap;
      transform-origin: center;
      transform: rotate(-90deg);
    }
    
    .back-cover-text {
      ${generateBackCoverTextStyles(designData, dimensions)}
      position: absolute;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .blurb-box {
      ${generateBlurbBoxStyles(designData, dimensions)}
    }
    
    .pattern-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
  `
}

function generateBackCoverStyles(designData: DesignData, aiBackImageUrl?: string): string {
  const bgType = designData.backCoverBackgroundType || 'flat'
  
  if (bgType === 'ai' && aiBackImageUrl) {
    return `
      background-image: url('${aiBackImageUrl}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    `
  }
  
  if (bgType === 'gradient') {
    const startColor = designData.backCoverGradientStartColor || '#ffffff'
    const endColor = designData.backCoverGradientEndColor || '#e0e0e0'
    const direction = designData.backCoverGradientDirection || 'vertical'
    const gradientDirection = direction === 'horizontal' ? 'to right' : 'to bottom'
    
    return `background: linear-gradient(${gradientDirection}, ${startColor}, ${endColor});`
  }
  
  if (bgType === 'pattern') {
    return generatePatternBackground(designData)
  }
  
  // Default flat background
  return `background: ${designData.backCoverBackgroundColor || '#ffffff'};`
}

function generatePatternBackground(designData: DesignData): string {
  const patternType = designData.backCoverPatternType || 'stripes'
  const color1 = designData.backCoverPatternColor1 || '#ffffff'
  const color2 = designData.backCoverPatternColor2 || '#e0e0e0'
  const scale = designData.backCoverPatternScale || 20
  
  // Generate CSS patterns using background-image
  switch (patternType) {
    case 'stripes':
      const direction = designData.backCoverPatternDirection === 'horizontal' ? '0deg' : '90deg'
      return `background: repeating-linear-gradient(${direction}, ${color1} 0px, ${color1} ${scale}px, ${color2} ${scale}px, ${color2} ${scale * 2}px);`
      
    case 'dots':
      return `
        background-color: ${color1};
        background-image: radial-gradient(circle, ${color2} ${scale * 0.3}px, transparent ${scale * 0.3}px);
        background-size: ${scale}px ${scale}px;
      `
      
    case 'checkerboard':
      return `
        background-color: ${color1};
        background-image: 
          linear-gradient(45deg, ${color2} 25%, transparent 25%), 
          linear-gradient(-45deg, ${color2} 25%, transparent 25%), 
          linear-gradient(45deg, transparent 75%, ${color2} 75%), 
          linear-gradient(-45deg, transparent 75%, ${color2} 75%);
        background-size: ${scale}px ${scale}px;
        background-position: 0 0, 0 ${scale/2}px, ${scale/2}px -${scale/2}px, -${scale/2}px 0px;
      `
      
    case 'diagonal':
      return `background: repeating-linear-gradient(45deg, ${color1} 0px, ${color1} ${scale}px, ${color2} ${scale}px, ${color2} ${scale * 2}px);`
      
    case 'grid':
      return `
        background-color: ${color1};
        background-image: 
          linear-gradient(${color2} 1px, transparent 1px), 
          linear-gradient(90deg, ${color2} 1px, transparent 1px);
        background-size: ${scale}px ${scale}px;
      `
      
    case 'circles':
      return `
        background-color: ${color1};
        background-image: radial-gradient(circle, ${color2} ${scale * 0.3}px, transparent ${scale * 0.3}px);
        background-size: ${scale}px ${scale}px;
      `
      
    case 'triangles':
      return `
        background-color: ${color1};
        background-image: 
          linear-gradient(30deg, transparent 30%, ${color2} 30%, ${color2} 70%, transparent 70%),
          linear-gradient(150deg, transparent 30%, ${color2} 30%, ${color2} 70%, transparent 70%);
        background-size: ${scale}px ${scale * 0.866}px;
      `
      
    case 'hexagons':
      return `
        background-color: ${color1};
        background-image: 
          radial-gradient(circle farthest-side at 0% 50%, transparent 23.5%, ${color2} 25.5%, ${color2} 32%, transparent 34%),
          radial-gradient(circle farthest-side at 50% 100%, transparent 23.5%, ${color2} 25.5%, ${color2} 32%, transparent 34%),
          radial-gradient(circle farthest-side at 100% 50%, transparent 23.5%, ${color2} 25.5%, ${color2} 32%, transparent 34%),
          radial-gradient(circle farthest-side at 50% 0%, transparent 23.5%, ${color2} 25.5%, ${color2} 32%, transparent 34%);
        background-size: ${scale}px ${scale * 0.866}px;
        background-position: 0 0, ${scale/2}px ${scale * 0.433}px, 0 ${scale * 0.866}px, ${scale/2}px ${scale * 1.299}px;
      `
      
    case 'waves':
      return `
        background-color: ${color1};
        background-image: 
          repeating-linear-gradient(0deg, transparent, transparent ${scale/4}px, ${color2} ${scale/4}px, ${color2} ${scale/2}px),
          repeating-linear-gradient(90deg, transparent, transparent ${scale}px, ${color2} ${scale}px, ${color2} ${scale + 2}px);
        background-size: ${scale * 2}px ${scale}px;
      `
      
    case 'diamonds':
      return `
        background-color: ${color1};
        background-image: 
          linear-gradient(45deg, transparent 25%, ${color2} 25%, ${color2} 75%, transparent 75%),
          linear-gradient(-45deg, transparent 25%, ${color2} 25%, ${color2} 75%, transparent 75%);
        background-size: ${scale}px ${scale}px;
        background-position: 0 0, ${scale/2}px ${scale/2}px;
      `
      
    default:
      return `background: ${color1};`
  }
}

function generateSpineStyles(designData: DesignData): string {
  const bgType = designData.spineBackgroundType || 'flat'
  
  if (bgType === 'gradient') {
    const startColor = designData.spineGradientStartColor || '#ffffff'
    const endColor = designData.spineGradientEndColor || '#e0e0e0'
    const direction = designData.spineGradientDirection || 'vertical'
    const gradientDirection = direction === 'horizontal' ? 'to right' : 'to bottom'
    
    return `background: linear-gradient(${gradientDirection}, ${startColor}, ${endColor});`
  }
  
  return `background: ${designData.spineBackgroundColor || '#e0e0e0'};`
}

function generateSpineTextStyles(designData: DesignData, dimensions: Dimensions): string {
  const fontSize = (designData.spineFontSize || 12) * (dimensions.dpi / 72)
  const fontFamily = designData.spineFont || 'Arial, sans-serif'
  const color = designData.spineColor || '#000000'
  
  return `
    font-family: ${fontFamily};
    font-size: ${fontSize}px;
    color: ${color};
    text-align: center;
    line-height: 1.2;
  `
}

function generateBackCoverTextStyles(designData: DesignData, dimensions: Dimensions): string {
  const fontSize = (designData.backCoverFontSize || 10) * (dimensions.dpi / 72)
  const fontFamily = designData.backCoverFont || 'Arial, sans-serif'
  const color = designData.backCoverTextColor || '#000000'
  
  return `
    font-family: ${fontFamily};
    font-size: ${fontSize}px;
    color: ${color};
    line-height: 1.4;
  `
}

function generateBlurbBoxStyles(designData: DesignData, dimensions: Dimensions): string {
  if (!designData.backCoverBlurbEnableBox) return 'display: none;'
  
  const fillColor = designData.backCoverBlurbBoxFillColor || 'rgba(255, 255, 255, 0.9)'
  const cornerRadius = (designData.backCoverBlurbBoxCornerRadius || 20) * (dimensions.dpi / 72)
  const padding = (designData.backCoverBlurbBoxPadding || 15) * (dimensions.dpi / 72)
  const opacity = designData.backCoverBlurbBoxOpacity || 0.9
  
  // Calculate position and size as percentages of back cover area
  const xOffsetPercent = designData.backCoverBlurbBoxXOffsetPercent || 10
  const yOffsetPercent = designData.backCoverBlurbBoxYOffsetPercent || 10
  const widthPercent = designData.backCoverBlurbBoxWidthPercent || 80
  const heightPercent = designData.backCoverBlurbBoxHeightPercent || 30
  
  const left = (xOffsetPercent / 100) * dimensions.frontWidth
  const top = (yOffsetPercent / 100) * dimensions.frontHeight
  const width = (widthPercent / 100) * dimensions.frontWidth
  const height = (heightPercent / 100) * dimensions.frontHeight
  
  return `
    position: absolute;
    left: ${left}px;
    top: ${top}px;
    width: ${width}px;
    height: ${height}px;
    background: ${fillColor};
    border-radius: ${cornerRadius}px;
    padding: ${padding}px;
    opacity: ${opacity};
    display: flex;
    align-items: center;
    justify-content: center;
  `
}

function generateCoverStructure(
  dimensions: Dimensions,
  bookDetails: BookDetails,
  designData: DesignData
): string {
  const spineText = designData.spineText || `${bookDetails.title} • ${bookDetails.author}`
  const backCoverText = designData.backCoverText || ''
  
  return `
    <div class="bleed-area">
      <div class="trim-area">
        <div class="back-cover">
          ${designData.backCoverBlurbEnableBox ? `
            <div class="blurb-box">
              <div class="back-cover-text">${backCoverText}</div>
            </div>
          ` : `
            <div class="back-cover-text" style="padding: 20px;">
              ${backCoverText}
            </div>
          `}
        </div>
        
        <div class="spine">
          <div class="spine-text">${spineText}</div>
        </div>
        
        <div class="front-cover"></div>
      </div>
    </div>
  `
}