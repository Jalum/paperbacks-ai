import { registerFont } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Google Fonts API endpoints for direct TTF access
const GOOGLE_FONTS_API_BASE = 'https://fonts.googleapis.com/css2';

// Font definitions matching our client-side fonts
const FONT_DEFINITIONS = {
  'Crimson Text': {
    googleName: 'Crimson+Text',
    weights: ['400', '600', '700'],
    family: 'Crimson Text'
  },
  'Inter': {
    googleName: 'Inter',
    weights: ['400', '500', '600', '700'],
    family: 'Inter'
  },
  'Open Sans': {
    googleName: 'Open+Sans',
    weights: ['400', '600', '700'],
    family: 'Open Sans'
  },
  'Montserrat': {
    googleName: 'Montserrat',
    weights: ['400', '500', '600', '700'],
    family: 'Montserrat'
  },
  'Playfair Display': {
    googleName: 'Playfair+Display',
    weights: ['400', '700'],
    family: 'Playfair Display'
  },
  'Lora': {
    googleName: 'Lora',
    weights: ['400', '700'],
    family: 'Lora'
  },
  'Merriweather': {
    googleName: 'Merriweather',
    weights: ['400', '700'],
    family: 'Merriweather'
  },
  'Roboto Slab': {
    googleName: 'Roboto+Slab',
    weights: ['400', '700'],
    family: 'Roboto Slab'
  },
  'Libre Baskerville': {
    googleName: 'Libre+Baskerville',
    weights: ['400', '700'],
    family: 'Libre Baskerville'
  },
  'PT Serif': {
    googleName: 'PT+Serif',
    weights: ['400', '700'],
    family: 'PT Serif'
  },
  'Poppins': {
    googleName: 'Poppins',
    weights: ['400', '500', '600', '700'],
    family: 'Poppins'
  },
  'Nunito': {
    googleName: 'Nunito',
    weights: ['400', '600', '700'],
    family: 'Nunito'
  },
  'Source Sans 3': {
    googleName: 'Source+Sans+3',
    weights: ['400', '600', '700'],
    family: 'Source Sans 3'
  },
  'Oswald': {
    googleName: 'Oswald',
    weights: ['400', '600'],
    family: 'Oswald'
  },
  'Dancing Script': {
    googleName: 'Dancing+Script',
    weights: ['400', '700'],
    family: 'Dancing Script'
  }
};

// Cache for registered fonts
const registeredFonts = new Set<string>();

// Directory for font files (use /tmp for serverless environments)
const FONT_DIR = process.env.NODE_ENV === 'production' ? '/tmp/fonts' : path.join(process.cwd(), '.fonts');

// Ensure font directory exists
if (!fs.existsSync(FONT_DIR)) {
  fs.mkdirSync(FONT_DIR, { recursive: true });
}

// Extract TTF URLs from Google Fonts CSS
async function getTTFUrlFromCSS(fontFamily: string, weight: string = '400'): Promise<string | null> {
  const fontDef = FONT_DEFINITIONS[fontFamily as keyof typeof FONT_DEFINITIONS];
  if (!fontDef) return null;

  const cssUrl = `${GOOGLE_FONTS_API_BASE}?family=${fontDef.googleName}:wght@${weight}&display=swap`;
  
  return new Promise((resolve) => {
    https.get(cssUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // Parse CSS to find TTF URL
        const ttfMatch = data.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/);
        resolve(ttfMatch ? ttfMatch[1] : null);
      });
    }).on('error', () => resolve(null));
  });
}

// Download font file
async function downloadFont(url: string, filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', () => {
      fs.unlink(filePath, () => {}); // Clean up on error
      resolve(false);
    });
  });
}

// Register a Google Font with node-canvas
export async function registerGoogleFont(fontFamily: string, weight: string = '400'): Promise<boolean> {
  const fontKey = `${fontFamily}-${weight}`;
  
  // Skip if already registered
  if (registeredFonts.has(fontKey)) {
    return true;
  }

  try {
    // Get TTF URL from Google Fonts CSS
    const ttfUrl = await getTTFUrlFromCSS(fontFamily, weight);
    if (!ttfUrl) {
      console.warn(`Could not find TTF URL for ${fontFamily} weight ${weight}`);
      return false;
    }

    // Create local file path
    const fileName = `${fontFamily.replace(/\s+/g, '-')}-${weight}.ttf`;
    const filePath = path.join(FONT_DIR, fileName);

    // Download if not already cached
    if (!fs.existsSync(filePath)) {
      console.log(`Downloading font: ${fontFamily} ${weight}`);
      const success = await downloadFont(ttfUrl, filePath);
      if (!success) {
        console.error(`Failed to download font: ${fontFamily} ${weight}`);
        return false;
      }
    }

    // Register with node-canvas
    const fontDef = FONT_DEFINITIONS[fontFamily as keyof typeof FONT_DEFINITIONS];
    registerFont(filePath, { 
      family: fontDef.family,
      weight: weight === '400' ? 'normal' : weight,
      style: 'normal'
    });

    registeredFonts.add(fontKey);
    console.log(`Successfully registered font: ${fontFamily} ${weight}`);
    return true;

  } catch (error) {
    console.error(`Error registering font ${fontFamily}:`, error);
    return false;
  }
}

// Get the correct font family name for canvas usage
export function getCanvasFontFamily(fontFamily?: string): string {
  if (!fontFamily) return 'Arial';

  // Check if it's a system font
  const systemFonts = ['Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New'];
  for (const systemFont of systemFonts) {
    if (fontFamily.toLowerCase().includes(systemFont.toLowerCase())) {
      return systemFont;
    }
  }

  // Check if it's a Google Font we support
  for (const [fontName, fontDef] of Object.entries(FONT_DEFINITIONS)) {
    if (fontFamily.toLowerCase().includes(fontName.toLowerCase()) || 
        fontFamily.toLowerCase().includes(fontName.toLowerCase().replace(/\s+/g, '_')) ||
        fontFamily.toLowerCase().includes(fontName.toLowerCase().replace(/\s+/g, '-'))) {
      return fontDef.family;
    }
  }

  // Check for generic font families
  if (fontFamily.toLowerCase().includes('serif')) return 'Times New Roman';
  if (fontFamily.toLowerCase().includes('sans-serif')) return 'Arial';
  if (fontFamily.toLowerCase().includes('monospace')) return 'Courier New';

  // Default fallback
  return 'Arial';
}

// Initialize fonts used in the project
export async function initializeRequiredFonts(): Promise<void> {
  console.log('Initializing required Google Fonts for server rendering...');
  
  // Register the most commonly used fonts
  const commonFonts = [
    'Crimson Text',
    'Inter', 
    'Open Sans',
    'Playfair Display',
    'Lora',
    'Merriweather',
    'Montserrat',
    'Poppins'
  ];

  const registrationPromises = commonFonts.map(font => 
    registerGoogleFont(font, '400').catch(err => {
      console.warn(`Failed to register ${font}:`, err);
      return false;
    })
  );

  await Promise.all(registrationPromises);
  console.log('Font initialization complete');
}