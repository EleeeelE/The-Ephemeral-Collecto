import React from 'react';

interface ClayCardProps {
  children: React.ReactNode;
  className?: string;
  pressed?: boolean;
  onClick?: () => void;
}

export const ClayCard: React.FC<ClayCardProps> = ({ children, className = '', pressed = false, onClick }) => {
  const shadowClass = pressed ? 'shadow-clay-pressed' : 'shadow-clay-flat';
  
  return (
    <div 
      onClick={onClick}
      className={`bg-clay-base rounded-3xl p-6 transition-all duration-500 ease-out ${shadowClass} ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] active:shadow-clay-pressed' : ''}`}
    >
      {children}
    </div>
  );
};