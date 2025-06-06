'use client';

import React from 'react';
import { useProjectStore } from '@/lib/store';
import { DesignData } from '@/types';
import { fontOptions } from '@/lib/fonts';

export default function SpineControls() {
  const { designData, setDesignData } = useProjectStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number = value;

    if (type === 'number') {
      processedValue = parseFloat(value);
    }

    setDesignData({ [name]: processedValue } as Partial<DesignData>);
  };

  return (
    <div className="p-4 border border-gray-300 rounded-md space-y-4">
      <h3 className="text-lg font-semibold">Spine Customization</h3>

      {/* Spine Text input is removed as it comes from Book Title & Author */}

      <div>
        <label htmlFor="spineFont" className="block text-sm font-medium text-gray-700">Font Family</label>
        <select
          id="spineFont"
          name="spineFont"
          value={designData.spineFont || 'Arial, sans-serif'}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          style={{ fontFamily: designData.spineFont || 'Arial, sans-serif' }}
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
        <label htmlFor="spineFontSize" className="block text-sm font-medium text-gray-700">Font Size (pt)</label>
        <input
          type="number"
          id="spineFontSize"
          name="spineFontSize"
          value={designData.spineFontSize || 12}
          onChange={handleChange}
          min="6"
          max="72" // Adjusted max for typical spine text
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="spineColor" className="block text-sm font-medium text-gray-700">Text Color</label>
        <input
          type="color"
          id="spineColor"
          name="spineColor"
          value={designData.spineColor || '#000000'}
          onChange={handleChange}
          className="mt-1 block w-full h-10 px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Background Type</label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setDesignData({ spineBackgroundType: 'flat' })}
            className={`px-4 py-2 border border-gray-300 rounded-l-md text-sm font-medium
              ${(designData.spineBackgroundType === undefined || designData.spineBackgroundType === 'flat') ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700'}
              hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            Flat
          </button>
          <button
            type="button"
            onClick={() => setDesignData({ spineBackgroundType: 'gradient' })}
            className={`px-4 py-2 border-t border-b border-r border-gray-300 rounded-r-md text-sm font-medium
              ${designData.spineBackgroundType === 'gradient' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700'}
              hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            Gradient
          </button>
        </div>
      </div>

      {(designData.spineBackgroundType === undefined || designData.spineBackgroundType === 'flat') && (
        <div>
          <label htmlFor="spineBackgroundColor" className="block text-sm font-medium text-gray-700">Background Color</label>
          <input
            type="color"
            id="spineBackgroundColor"
            name="spineBackgroundColor"
            value={designData.spineBackgroundColor || '#FFFFFF'}
            onChange={handleChange}
            className="mt-1 block w-full h-10 px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      )}

      {designData.spineBackgroundType === 'gradient' && (
        <>
          <div>
            <label htmlFor="spineGradientStartColor" className="block text-sm font-medium text-gray-700">Gradient Start Color</label>
            <input
              type="color"
              id="spineGradientStartColor"
              name="spineGradientStartColor"
              value={designData.spineGradientStartColor || '#FFFFFF'}
              onChange={handleChange}
              className="mt-1 block w-full h-10 px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="spineGradientEndColor" className="block text-sm font-medium text-gray-700">Gradient End Color</label>
            <input
              type="color"
              id="spineGradientEndColor"
              name="spineGradientEndColor"
              value={designData.spineGradientEndColor || '#000000'}
              onChange={handleChange}
              className="mt-1 block w-full h-10 px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="spineGradientDirection" className="block text-sm font-medium text-gray-700">Gradient Direction</label>
            <select
              id="spineGradientDirection"
              name="spineGradientDirection"
              value={designData.spineGradientDirection || 'vertical'}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
            </select>
          </div>
        </>
      )}

      {/* Placeholder for Text Orientation - UI only for now */}
      {/* <div className="flex items-center">
        <input id="spineTextVertical" name="spineTextVertical" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
        <label htmlFor="spineTextVertical" className="ml-2 block text-sm text-gray-900">Vertical Text (Top-to-Bottom)</label>
      </div> */}

    </div>
  );
} 