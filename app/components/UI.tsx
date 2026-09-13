import React, { useState, useEffect, useRef } from 'react';
export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-1">
    <div className="w-1 h-3 bg-[#8B5CF6] rounded-full opacity-60" />
    <span className="text-[11px] font-bold text-white/50 tracking-[0.5px] uppercase">
      {children}
    </span>
  </div>
);
export const PillButton: React.FC<{
  icon?: React.ReactNode; 
  children: React.ReactNode;
  variant?: 'filled' | 'outline' | 'solid'; 
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ icon, children, variant = 'filled', onClick, disabled, className = '' }) => {
  const base = 'flex items-center gap-2 justify-center w-full h-[38px] rounded-xl font-medium tracking-[0.2px] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.97]';
  const variants: Record<string, string> = {
    filled: 'bg-[#181223] hover:bg-[#231B32] text-white/90 border border-white/5',
    outline: 'border border-[#8B5CF6]/30 hover:border-[#8B5CF6]/60 hover:bg-[#8B5CF6]/5 text-white',
    solid: 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-[0_8px_25px_rgba(139,92,246,0.2)]',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>
      {icon && <span className="flex items-center justify-center">{icon}</span>}
      <span className="text-[12px] truncate">{children}</span>
    </button>
  );
};
export const TextInput: React.FC<{
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onChange, placeholder, disabled }) => (
  <textarea 
    value={value} 
    onChange={(e) => onChange(e.target.value)} 
    placeholder={placeholder}
    disabled={disabled}
    className="border border-white/10 hover:border-[#8B5CF6]/30 focus:border-[#8B5CF6] rounded-2xl w-full h-[120px] px-4 py-3.5 resize-none bg-[#0D0913] text-[13px] font-medium text-white placeholder-white/30 tracking-[0.1px] focus:outline-none transition-all leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed" 
  />
);
type DropdownOptionObject = {
  value: string;
  label: string;
  description?: string;
  thumbnailSrc?: string;
};
type DropdownOption = string | DropdownOptionObject;
export const FieldDropdown: React.FC<{
  label: string; 
  value: string; 
  options: DropdownOption[];
  onChange: (val: string) => void; 
  className?: string;
  disabled?: boolean;
}> = ({ label, value, options, onChange, className = '', disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Close when clicking outside
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  // Close dropdown when it becomes disabled
  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);
  const currentOpt = options.find(o => typeof o === 'string' ? o === value : o.value === value);
  const displayLabel = typeof currentOpt === 'string' ? currentOpt : currentOpt?.label || value;
  const displayThumbnail = typeof currentOpt === 'string' ? undefined : currentOpt?.thumbnailSrc;
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button 
        type="button" 
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left border ${isOpen ? 'border-[#8B5CF6]' : 'border-white/10 hover:border-[#8B5CF6]/30'} transition-all rounded-xl flex flex-col justify-center min-h-[52px] py-1.5 px-3.5 bg-[#0D0913] select-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}>
        <p className="text-[10px] font-bold text-white/30 tracking-[0.5px] uppercase mb-0.5">{label}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {displayThumbnail && (
              <img 
                src={displayThumbnail} 
                alt="" 
                className="w-7 h-7 rounded-lg object-cover border border-white/10 shrink-0" 
              />
            )}
            <span className="text-[13px] font-semibold text-white tracking-[0.2px] truncate">{displayLabel}</span>
          </div>
          {!disabled && <span className={`material-symbols-outlined text-[18px] text-white/40 transition-transform ${isOpen ? 'rotate-180 text-[#8B5CF6]' : ''}`}>expand_more</span>}
        </div>
      </button>
      {isOpen && !disabled && (
        <div className="absolute z-50 top-[calc(100%+6px)] left-0 w-full bg-[#0D0913] border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl animate-dropdown origin-top">
          <div className="max-h-60 overflow-y-auto dark-scrollbar">
            {options.map((opt) => {
              const optVal = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              const optDesc = typeof opt === 'string' ? undefined : opt.description;
              const optThumb = typeof opt === 'string' ? undefined : opt.thumbnailSrc;
              const isSelected = value === optVal;
              return (
                <button key={optVal} type="button"
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-[#8B5CF6]/10 transition-colors flex items-center gap-3 ${isSelected ? 'bg-[#8B5CF6]/15 text-[#A78BFA]' : 'text-white/80'}`}
                  onClick={() => { onChange(optVal); setIsOpen(false); }}>
                  {optThumb && (
                    <img 
                      src={optThumb} 
                      alt="" 
                      className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0" 
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold truncate">{optLabel}</p>
                    {optDesc && <p className="text-[10px] text-white/30 mt-0.5 leading-tight truncate">{optDesc}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
