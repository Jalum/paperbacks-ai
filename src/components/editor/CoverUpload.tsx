import React, { useCallback, useState } from 'react';
import { useDropzone, FileWithPath, FileRejection } from 'react-dropzone';
import { useProjectStore } from '@/lib/store';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { upload } from '@vercel/blob/client';

const MAX_SIZE = 4 * 1024 * 1024; // 4MB - conservative limit for fallback upload
const ACCEPTED_FILES = {
  'image/jpeg': [],
  'image/png': [],
  'image/webp': [],
};

export default function CoverUpload() {
  const { data: session } = useSession();
  const { coverImage, setCoverImage } = useProjectStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(typeof coverImage === 'string' ? coverImage : null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize ColorThief instance - uncomment when ready to use
  // const colorThief = new ColorThief();

  const handleResponse = useCallback(async (response: Response): Promise<string> => {
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.get('content-type'));
    if (!response.ok) {
      let errorMessage = 'Upload failed';
      
      // Handle specific HTTP status codes
      if (response.status === 413) {
        errorMessage = 'File too large for upload. Please try a smaller file (max 5-6MB recommended).';
      } else if (response.status === 504 || response.status === 524) {
        errorMessage = 'Upload timed out. Please try a smaller file.';
      } else {
        // Try to get error details from response
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error('Upload failed:', errorData);
            errorMessage = errorData.error || `Upload failed: ${response.status} ${response.statusText}`;
          } else {
            const errorText = await response.text();
            console.error('Error response text:', errorText);
            errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    let data;
    try {
      data = await response.json();
      console.log('Upload successful:', data);
    } catch (parseError) {
      console.error('Failed to parse success response as JSON:', parseError);
      try {
        const responseText = await response.text();
        console.error('Response text:', responseText);
        throw new Error('Server returned invalid JSON response');
      } catch (textError) {
        console.error('Failed to read response as text:', textError);
        throw new Error('Failed to read server response');
      }
    }
    
    return data.url;
  }, []);

  const compressImage = useCallback(async (file: File): Promise<File> => {
    console.log('Compressing image from', (file.size / 1024 / 1024).toFixed(1), 'MB');
    
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new globalThis.Image();
      
      img.onload = () => {
        let { width, height } = img;
        let quality = 0.85;
        let maxDimension = 2000;
        
        // Determine compression level based on original file size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 8) {
          maxDimension = 1600;
          quality = 0.7;
        } else if (fileSizeMB > 6) {
          maxDimension = 1800;
          quality = 0.75;
        } else if (fileSizeMB > 4) {
          maxDimension = 2000;
          quality = 0.8;
        }
        
        // Calculate new dimensions
        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        const tryCompress = (currentQuality: number) => {
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              console.log('Compressed to', (compressedFile.size / 1024 / 1024).toFixed(1), 'MB', 'at quality', currentQuality);
              
              // If still too large and we can compress more, try again
              if (compressedFile.size > MAX_SIZE && currentQuality > 0.5) {
                console.log('Still too large, trying lower quality...');
                tryCompress(currentQuality - 0.1);
              } else {
                resolve(compressedFile);
              }
            } else {
              reject(new Error('Failed to compress image'));
            }
          }, 'image/jpeg', currentQuality);
        };
        
        tryCompress(quality);
      };
      
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const uploadToBlob = useCallback(async (file: File): Promise<string> => {
    console.log('Starting upload for file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Check if we should use direct blob upload (production) or fallback (development)
    // In production, we'll try direct upload first and fallback if it fails
    const shouldTryDirectUpload = true; // Always try direct upload first
    
    // Check if Vercel Blob is available by trying a simple test
    const canUseVercelBlob = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    
    if (shouldTryDirectUpload && canUseVercelBlob) {
      // Try direct Vercel Blob upload first (bypasses 4.5MB limit)
      console.log('Attempting direct Vercel Blob upload');
      
      // Generate unique filename with user session info
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const filename = `covers/${session?.user?.email || 'anonymous'}/${timestamp}.${fileExtension}`;
      
      try {
        const blob = await upload(filename, file, {
          access: 'public',
          handleUploadUrl: '/api/upload/blob-handler',
        });
        
        console.log('Direct blob upload successful:', blob.url);
        
        // Still save metadata to database
        try {
          await fetch('/api/upload/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: blob.pathname,
              url: blob.url,
              originalName: file.name,
              contentType: file.type,
              size: file.size,
            }),
          });
        } catch (metadataError) {
          console.warn('Failed to save metadata, but upload was successful:', metadataError);
        }
        
        return blob.url;
      } catch (error) {
        console.error('Direct blob upload failed:', error);
        if (error instanceof Error) {
          // Check for specific error types
          if (error.message.includes('aborted') || error.message.includes('network')) {
            console.log('Network issue with direct upload, falling back to compression');
          } else if (error.message.includes('unauthorized') || error.message.includes('auth')) {
            console.log('Authentication issue with direct upload, falling back to compression');
          }
        }
        // Fall through to compression method below
      }
    }
    
    console.log('Using fallback upload with compression');
    
    // Compress if needed
    const processedFile = await compressImage(file);
    
    // Final size check after compression
    if (processedFile.size > MAX_SIZE) {
      throw new Error(`File still too large after compression (${(processedFile.size / 1024 / 1024).toFixed(1)}MB). Please try a smaller or lower resolution image.`);
    }
    
    const formData = new FormData();
    formData.append('file', processedFile);

    console.log('Sending request to /api/upload');
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return await handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Upload timed out. Please try with a smaller file or check your connection.');
      }
      throw error;
    }
  }, [handleResponse, compressImage, session]);

  const onDrop = useCallback(
    async (acceptedFiles: FileWithPath[], rejectedFiles: FileRejection[]) => {
      setError(null);
      
      if (rejectedFiles && rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0].errors[0];
        if (firstError.code === 'file-too-large') {
          setError(`File is too large. Max size is ${MAX_SIZE / 1024 / 1024}MB.`);
        } else if (firstError.code === 'file-invalid-type') {
          setError('Invalid file type. Please upload a JPG, PNG, or WEBP image.');
        } else {
          setError(firstError.message);
        }
        setCoverImage('');
        if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        return;
      }

      if (acceptedFiles && acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        
        if (!session) {
          setError('Please sign in to upload images');
          return;
        }

        setIsUploading(true);
        
        try {
          // Create local preview immediately
          const objectUrl = URL.createObjectURL(file);
          setPreviewUrl(objectUrl);
          
          // Upload to blob storage
          const blobUrl = await uploadToBlob(file);
          
          // Store the blob URL in Zustand (not the File object)
          setCoverImage(blobUrl);
          
          // Clean up local object URL and use blob URL for preview
          URL.revokeObjectURL(objectUrl);
          setPreviewUrl(blobUrl);
          
        } catch (error) {
          console.error('Upload error:', error);
          let errorMessage = 'Upload failed';
          if (error instanceof Error) {
            errorMessage = error.message;
            // Provide specific guidance for common issues
            if (error.message.includes('timeout')) {
              errorMessage = `${error.message} Large files may take longer to process.`;
            } else if (error.message.includes('too large')) {
              errorMessage = `${error.message} Try compressing your image or choosing a smaller file.`;
            }
          }
          setError(errorMessage);
          setCoverImage('');
          if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        } finally {
          setIsUploading(false);
        }
      }
    },
    [setCoverImage, previewUrl, session, uploadToBlob] 
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILES,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  // Clean up object URL when component unmounts or previewUrl changes
  React.useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="p-4 border border-gray-300 rounded-md">
      <h3 className="text-lg font-semibold mb-2">Upload Front Cover</h3>
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-md cursor-pointer hover:border-indigo-500 transition-colors
          ${isDragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}
          ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} disabled={isUploading} />
        {isUploading ? (
          <p className="text-center text-indigo-700">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-center text-indigo-700">Drop the image here ...</p>
        ) : (
          <p className="text-center text-gray-500">Drag & drop cover image here, or click to select (Large images auto-compressed, JPG/PNG/WEBP)</p>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {previewUrl && (
        <div className="mt-4">
          <h4 className="text-md font-semibold">Preview:</h4>
          <div className="relative w-full h-64 mt-2 border border-gray-200 rounded overflow-hidden">
            <Image src={previewUrl} alt="Cover preview" layout="fill" objectFit="contain" />
          </div>
        </div>
      )}
    </div>
  );
} 