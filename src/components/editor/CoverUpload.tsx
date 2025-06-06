import React, { useCallback, useState } from 'react';
import { useDropzone, FileWithPath, FileRejection } from 'react-dropzone';
import { useProjectStore } from '@/lib/store';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
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

  const uploadToBlob = async (file: File): Promise<string> => {
    console.log('Starting upload for file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    const formData = new FormData();
    formData.append('file', file);

    console.log('Sending request to /api/upload');
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Upload failed:', errorData);
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    console.log('Upload successful:', data);
    return data.url;
  };

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
          setError(error instanceof Error ? error.message : 'Upload failed');
          setCoverImage('');
          if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        } finally {
          setIsUploading(false);
        }
      }
    },
    [setCoverImage, previewUrl, session] 
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
          <p className="text-center text-gray-500">Drag & drop cover image here, or click to select (Max 5MB, JPG/PNG/WEBP)</p>
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