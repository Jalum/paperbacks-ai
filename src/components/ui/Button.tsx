import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export default function Button({ children, variant = 'primary', ...props }: ButtonProps) {
  const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-500 hover:bg-gray-700 text-white'
  };

  return (
    <button
      {...props}
      className={`px-4 py-2 font-semibold rounded disabled:opacity-50 ${variantClasses[variant]} ${props.className || ''}`}
    >
      {children}
    </button>
  );
} 