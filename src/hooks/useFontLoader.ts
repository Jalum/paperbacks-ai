import { useState, useEffect } from 'react';
import { allGoogleFonts } from '@/lib/fonts';

export function useFontLoader() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        // Wait for document.fonts API to be ready
        if (typeof document !== 'undefined' && document.fonts) {
          // Track loading progress
          const totalFonts = allGoogleFonts.length;
          let loadedCount = 0;

          // Listen for font loading events
          const updateProgress = () => {
            loadedCount++;
            setLoadingProgress((loadedCount / totalFonts) * 100);
          };

          // Check each Google Font
          const fontLoadPromises = allGoogleFonts.map(async (fontObj) => {
            const fontFamily = fontObj.style.fontFamily;
            
            // Check if font is already loaded
            if (document.fonts.check(`16px ${fontFamily}`)) {
              updateProgress();
              return Promise.resolve();
            }

            // Wait for font to load
            return document.fonts.load(`16px ${fontFamily}`).then(() => {
              updateProgress();
            }).catch((error) => {
              console.warn(`Failed to load font ${fontFamily}:`, error);
              updateProgress(); // Continue even if one font fails
            });
          });

          // Wait for all fonts to load or timeout after 10 seconds
          const timeoutPromise = new Promise<void>((resolve) => {
            setTimeout(() => {
              console.warn('Font loading timeout - proceeding with available fonts');
              resolve();
            }, 10000);
          });

          await Promise.race([
            Promise.all(fontLoadPromises),
            timeoutPromise
          ]);

          // Final check - wait for document.fonts.ready
          await document.fonts.ready;
          
          setFontsLoaded(true);
          setLoadingProgress(100);
        } else {
          // Fallback for SSR or when document.fonts is not available
          setFontsLoaded(true);
          setLoadingProgress(100);
        }
      } catch (error) {
        console.error('Error loading fonts:', error);
        // Set as loaded anyway to prevent blocking the UI
        setFontsLoaded(true);
        setLoadingProgress(100);
      }
    };

    loadFonts();
  }, []);

  return { fontsLoaded, loadingProgress };
}

// Utility function to check if a specific font is loaded
export function isFontLoaded(fontFamily: string): boolean {
  if (typeof document === 'undefined' || !document.fonts) {
    return true; // Assume loaded in SSR
  }
  
  try {
    return document.fonts.check(`16px ${fontFamily}`);
  } catch {
    return true; // Fallback to true if check fails
  }
}

// Utility function to wait for a specific font to load
export async function waitForFont(fontFamily: string, timeout = 5000): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) {
    return true; // Assume loaded in SSR
  }

  try {
    // If already loaded, return immediately
    if (document.fonts.check(`16px ${fontFamily}`)) {
      return true;
    }

    // Wait for font to load with timeout
    const fontLoadPromise = document.fonts.load(`16px ${fontFamily}`);
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeout);
    });

    const result = await Promise.race([fontLoadPromise, timeoutPromise]);
    return result !== false;
  } catch (error) {
    console.warn(`Failed to load font ${fontFamily}:`, error);
    return false;
  }
}