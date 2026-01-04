
import React from 'react';

interface AccessibleButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  className?: string;
  disabled?: boolean;
}

const AccessibleButton: React.FC<AccessibleButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary', 
  className = '',
  disabled = false
}) => {
  const baseStyles = "px-6 py-5 rounded-2xl font-extrabold text-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-lg border-4";
  
  const variants = {
    primary: "bg-yellow-400 border-yellow-500 text-black hover:bg-yellow-300",
    secondary: "bg-white border-yellow-400 text-black hover:bg-yellow-50",
    danger: "bg-red-500 border-red-700 text-white hover:bg-red-400",
    success: "bg-green-500 border-green-700 text-white hover:bg-green-400",
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export default AccessibleButton;
