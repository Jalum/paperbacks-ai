import { 
  Inter, 
  Playfair_Display, 
  Roboto_Slab, 
  Open_Sans, 
  Lora, 
  Montserrat, 
  Source_Sans_3, 
  Merriweather, 
  Poppins, 
  Nunito, 
  Crimson_Text, 
  Libre_Baskerville, 
  PT_Serif, 
  Oswald, 
  Dancing_Script 
} from 'next/font/google';

// Sans-serif fonts
export const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
});

export const openSans = Open_Sans({ 
  subsets: ['latin'],
  display: 'swap',
});

export const montserrat = Montserrat({ 
  subsets: ['latin'],
  display: 'swap',
});

export const sourceSans = Source_Sans_3({ 
  subsets: ['latin'],
  display: 'swap',
});

export const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const nunito = Nunito({ 
  subsets: ['latin'],
  display: 'swap',
});

// Serif fonts
export const playfairDisplay = Playfair_Display({ 
  subsets: ['latin'],
  display: 'swap',
});

export const robotoSlab = Roboto_Slab({ 
  subsets: ['latin'],
  display: 'swap',
});

export const lora = Lora({ 
  subsets: ['latin'],
  display: 'swap',
});

export const merriweather = Merriweather({ 
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  display: 'swap',
});

export const crimsonText = Crimson_Text({ 
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export const libreBaskerville = Libre_Baskerville({ 
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export const ptSerif = PT_Serif({ 
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

// Display fonts
export const oswald = Oswald({ 
  subsets: ['latin'],
  display: 'swap',
});

export const dancingScript = Dancing_Script({ 
  subsets: ['latin'],
  display: 'swap',
});

// Font options for dropdowns
export const fontOptions = [
  // System fonts (keep for fallback)
  { name: 'Arial', value: 'Arial, sans-serif', fontObject: null },
  { name: 'Verdana', value: 'Verdana, sans-serif', fontObject: null },
  { name: 'Times New Roman', value: 'Times New Roman, serif', fontObject: null },
  { name: 'Georgia', value: 'Georgia, serif', fontObject: null },
  { name: 'Courier New', value: 'Courier New, monospace', fontObject: null },
  
  // Google Fonts - Sans Serif
  { name: 'Inter', value: inter.style.fontFamily, fontObject: inter },
  { name: 'Open Sans', value: openSans.style.fontFamily, fontObject: openSans },
  { name: 'Montserrat', value: montserrat.style.fontFamily, fontObject: montserrat },
  { name: 'Source Sans 3', value: sourceSans.style.fontFamily, fontObject: sourceSans },
  { name: 'Poppins', value: poppins.style.fontFamily, fontObject: poppins },
  { name: 'Nunito', value: nunito.style.fontFamily, fontObject: nunito },
  
  // Google Fonts - Serif
  { name: 'Playfair Display', value: playfairDisplay.style.fontFamily, fontObject: playfairDisplay },
  { name: 'Roboto Slab', value: robotoSlab.style.fontFamily, fontObject: robotoSlab },
  { name: 'Lora', value: lora.style.fontFamily, fontObject: lora },
  { name: 'Merriweather', value: merriweather.style.fontFamily, fontObject: merriweather },
  { name: 'Crimson Text', value: crimsonText.style.fontFamily, fontObject: crimsonText },
  { name: 'Libre Baskerville', value: libreBaskerville.style.fontFamily, fontObject: libreBaskerville },
  { name: 'PT Serif', value: ptSerif.style.fontFamily, fontObject: ptSerif },
  
  // Google Fonts - Display
  { name: 'Oswald', value: oswald.style.fontFamily, fontObject: oswald },
  { name: 'Dancing Script', value: dancingScript.style.fontFamily, fontObject: dancingScript },
];

// Export all font objects for global loading
export const allGoogleFonts = [
  inter,
  openSans, 
  montserrat,
  sourceSans,
  poppins,
  nunito,
  playfairDisplay,
  robotoSlab,
  lora,
  merriweather,
  crimsonText,
  libreBaskerville,
  ptSerif,
  oswald,
  dancingScript,
];