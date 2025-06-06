// Utility functions will go here
// Example: export const someUtil = () => { ... };

export function calculateSpineWidth(pageCount: number, paperType: string): number {
  let paperThicknessFactor = 0.0572; // Default to white paper (mm per page)

  if (paperType === 'cream') {
    paperThicknessFactor = 0.0635; // mm per page for cream paper
  } else if (paperType === 'white') {
    paperThicknessFactor = 0.0572; // mm per page for white paper
  }
  // KDP also has factors for color paper, which could be added if supported:
  // Premium Color paper: page count x 0.0596 mm
  // Standard Color paper: page count x 0.0572 mm (same as white B&W)

  const spineWidth = pageCount * paperThicknessFactor;

  // KDP states a minimum page count of 79 for spine text.
  // While not a direct minimum width, it implies spines for lower page counts are very thin or non-existent for text.
  // For now, we won't enforce a strict minimum width based on this, but it's good to be aware of.
  // The previous logic had Math.max(spineWidth, 3) which might be a reasonable practical minimum for visual representation.
  // Let's keep a small practical minimum for rendering, e.g., 1mm, if calculated is less.
  return Math.max(spineWidth, 1); 
} 