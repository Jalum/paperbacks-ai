import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { BookDetails } from '@/types';
import { useProjectStore } from '@/lib/store';

const trimSizes = ["5x8", "5.25x8", "5.5x8.5", "6x9"];
const paperTypes = ["white", "cream"];

export default function BookInfoForm() {
  const { bookDetails, setBookDetails, getCalculatedSpineWidth } = useProjectStore();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookDetails>({
    defaultValues: bookDetails,
  });

  const onSubmit: SubmitHandler<BookDetails> = (data) => {
    setBookDetails(data);
    // console.log("Book details updated:", data);
    // console.log("New spine width:", getCalculatedSpineWidth());
  };

  // Watch for changes to update store reactively if needed, or rely on submit
  // For live spine width update, we might need to update on change
  React.useEffect(() => {
    const subscription = watch((value, { type }) => {
      if (type === 'change') {
        setBookDetails(value as BookDetails);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setBookDetails]);

  const currentSpineWidth = getCalculatedSpineWidth();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 border border-gray-300 rounded-md">
      <h3 className="text-lg font-semibold">Book Information</h3>
      
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
        <input
          id="title"
          {...register('title', { required: 'Title is required' })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="author" className="block text-sm font-medium text-gray-700">Author</label>
        <input
          id="author"
          {...register('author', { required: 'Author is required' })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.author && <p className="mt-1 text-sm text-red-600">{errors.author.message}</p>}
      </div>

      <div>
        <label htmlFor="pageCount" className="block text-sm font-medium text-gray-700">Page Count</label>
        <input
          id="pageCount"
          type="number"
          {...register('pageCount', { 
            required: 'Page count is required', 
            valueAsNumber: true, 
            min: { value: 10, message: 'Page count must be at least 10' }
          })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.pageCount && <p className="mt-1 text-sm text-red-600">{errors.pageCount.message}</p>}
      </div>

      <div>
        <label htmlFor="trimSize" className="block text-sm font-medium text-gray-700">Trim Size (inches)</label>
        <select
          id="trimSize"
          {...register('trimSize', { required: 'Trim size is required' })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          {trimSizes.map(size => <option key={size} value={size}>{size}</option>)}
        </select>
        {errors.trimSize && <p className="mt-1 text-sm text-red-600">{errors.trimSize.message}</p>}
      </div>

      <div>
        <label htmlFor="paperType" className="block text-sm font-medium text-gray-700">Paper Type</label>
        <select
          id="paperType"
          {...register('paperType', { required: 'Paper type is required' })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          {paperTypes.map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
        </select>
        {errors.paperType && <p className="mt-1 text-sm text-red-600">{errors.paperType.message}</p>}
      </div>

      <div className="mt-2 p-2 bg-gray-50 rounded">
        <p className="text-sm">Calculated Spine Width: <span className="font-semibold">{currentSpineWidth.toFixed(2)} mm</span></p>
      </div>

      {/* The submit button is optional if we update store on change */}
      {/* <Button type="submit">Update Book Info</Button> */}
    </form>
  );
} 