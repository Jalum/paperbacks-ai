import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function Button({ children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`px-4 py-2 font-semibold text-white bg-blue-500 rounded hover:bg-blue-700 disabled:opacity-50 ${props.className || ''}`}
    >
      {children}
    </button>
  );
} 