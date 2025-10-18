'use client';

import React from 'react';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

interface UploadButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  description: string;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function UploadButton({ 
  icon,
  label,
  description,
  isSelected = false,
  size = 'md',
  className = '', 
  ...props 
}: UploadButtonProps) {
  const sizeClasses = {
    sm: 'w-36 h-24 p-3',
    md: 'w-44 h-32 p-4',
    lg: 'w-52 h-36 p-5',
  };

  const iconSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const descriptionSizes = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <button
      className={`
        ${spaceGrotesk.className}
        ${sizeClasses[size]}
        relative
        inline-flex
        flex-col
        items-center
        justify-center
        font-semibold
        rounded-2xl
        transition-all
        duration-300
        ease-out
        transform
        cursor-pointer
        select-none
        overflow-hidden
        border-2
        ${isSelected 
          ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg scale-105 text-amber-800' 
          : 'border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:border-amber-300 hover:shadow-md hover:scale-102 text-gray-700'
        }
        hover:-translate-y-1
        active:scale-100
        active:translate-y-0
        disabled:opacity-50
        disabled:cursor-not-allowed
        disabled:transform-none
        ${className}
      `}
      style={{
        backgroundImage: isSelected 
          ? 'url("/button.png")' 
          : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: isSelected ? 'soft-light' : 'normal',
      }}
      {...props}
    >
      {/* Background overlay for better text readability */}
      <div className={`absolute inset-0 rounded-2xl ${
        isSelected 
          ? 'bg-gradient-to-br from-amber-100/80 to-amber-200/60' 
          : 'bg-gradient-to-br from-white/90 to-gray-50/90'
      } pointer-events-none`} />
      
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-amber-500 rounded-full shadow-sm z-10" />
      )}
      
      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-2">
        {/* Icon */}
        <div className={`${iconSizes[size]} mb-1`}>
          {icon}
        </div>
        
        {/* Label */}
        <div className={`${textSizes[size]} font-bold leading-tight`}>
          {label}
        </div>
        
        {/* Description */}
        <div className={`${descriptionSizes[size]} opacity-75 leading-tight px-1`}>
          {description}
        </div>
      </div>
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-all duration-500 ease-out transform -skew-x-12 translate-x-[-100%] hover:translate-x-[100%] pointer-events-none" />
      
      {/* Border highlight */}
      <div className={`absolute inset-0 rounded-2xl border ${
        isSelected 
          ? 'border-amber-300/50' 
          : 'border-white/30'
      } pointer-events-none`} />
    </button>
  );
}