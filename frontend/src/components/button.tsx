'use client';

import React from 'react';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}: ButtonProps) {
  const sizeClasses = {
    sm: 'w-32 h-10 text-xs',
    md: 'w-40 h-14 text-sm',
    lg: 'w-48 h-28 text-base',
  };

  const baseClasses = `
    ${spaceGrotesk.className}
    relative
    inline-flex
    items-center
    justify-center
    font-bold
    transition-all
    duration-300
    ease-out
    transform
    cursor-pointer
    select-none
    overflow-hidden
    ${sizeClasses[size]}
  `;

  if (variant === 'primary') {
    return (
      <button
        className={`
          ${baseClasses}
          bg-cover
          bg-center
          bg-no-repeat
          text-white
          shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.2)]
          hover:shadow-[0_12px_48px_rgba(0,0,0,0.4),inset_0_3px_6px_rgba(255,255,255,0.3),inset_0_-3px_6px_rgba(0,0,0,0.3)]
          hover:scale-110
          hover:-translate-y-2
          active:scale-105
          active:translate-y-0
          active:shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1),inset_0_-1px_2px_rgba(0,0,0,0.3)]
          disabled:opacity-50
          disabled:cursor-not-allowed
          disabled:transform-none
          disabled:shadow-[0_4px_16px_rgba(0,0,0,0.2)]
          ${className}
        `}
        style={{
          backgroundImage: 'url("/button.png")',
          backgroundSize: 'fit',
          backgroundPosition: 'center',
        }}
        {...props}
      >
        {/* Background image with hover animation */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out hover:scale-110"
          style={{
            backgroundImage: 'url("/button.png")',
            backgroundSize: '110%',
            backgroundPosition: 'center',
          }}
        />
        
        {/* 3D depth overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/30 pointer-events-none" />
        
        {/* Inner glow */}
        <div className="absolute inset-1 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 hover:opacity-100 transition-all duration-700 ease-out transform -skew-x-12 translate-x-[-150%] hover:translate-x-[150%] pointer-events-none" />
        
        {/* Radial shine on hover */}
        <div className="absolute inset-0 bg-radial-gradient from-white/30 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {/* Text container */}
        <span className="relative z-10 text-center font-bold tracking-wide drop-shadow-lg text-shadow-sm px-2">
          {children}
        </span>
        
        {/* Outer rim highlight */}
        <div className="absolute inset-0 border border-white/20 pointer-events-none" />
      </button>
    );
  }

  // Secondary variant (fallback)
  return (
    <button
      className={`
        ${baseClasses}
        bg-white/90
        text-gray-700
        border-2
        border-gray-300
        shadow-[0_4px_16px_rgba(0,0,0,0.1)]
        hover:border-gray-400
        hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)]
        hover:scale-105
        ${className}
      `}
      {...props}
    >
      <span className="relative z-10 text-center font-bold tracking-wide px-2">{children}</span>
    </button>
  );
}