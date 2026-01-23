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
  const baseStyles = "px-6 py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm";
  
  const variants = {
    primary: "bg-amber-400 text-stone-900 hover:bg-amber-300",
    secondary: "bg-white text-stone-700 hover:bg-stone-50 border border-stone-100",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-30 grayscale cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export default AccessibleButton;