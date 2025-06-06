'use client';

import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-700 text-gray-300 p-4 text-center mt-auto">
      <div className="container mx-auto">
        <p>&copy; {new Date().getFullYear()} Paperbacks.AI. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer; 