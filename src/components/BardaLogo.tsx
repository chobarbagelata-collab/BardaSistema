import React, { useState, useEffect } from 'react';

interface BardaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'horizontal' | 'vertical' | 'icon-only';
  showSubtitle?: boolean;
  titleText?: string;
  subtitleText?: string;
  className?: string;
}

export const BardaLogo: React.FC<BardaLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  showSubtitle = true,
  titleText = 'BARDA HOME',
  subtitleText = 'MODERN FURNITURE',
  className = '',
}) => {
  const [logoSrc, setLogoSrc] = useState<string>('/barda_chair_icon.svg');

  useEffect(() => {
    // Check if there is a custom or stored logo URL
    const saved = localStorage.getItem('barda_custom_logo');
    if (saved) {
      setLogoSrc(saved);
    } else {
      const baseUrl = (import.meta as any).env?.BASE_URL || '/';
      setLogoSrc(`${baseUrl}barda_chair_icon.svg`.replace(/\/+/g, '/'));
    }

    const handleStorageChange = () => {
      const updated = localStorage.getItem('barda_custom_logo');
      if (updated) {
        setLogoSrc(updated);
      } else {
        const baseUrl = (import.meta as any).env?.BASE_URL || '/';
        setLogoSrc(`${baseUrl}barda_chair_icon.svg`.replace(/\/+/g, '/'));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Icon sizing
  const iconHeightPx = {
    xs: 24,
    sm: 32,
    md: 44,
    lg: 58,
    xl: 86,
    '2xl': 120,
  };

  const titleSizes = {
    xs: 'text-xs tracking-[0.14em]',
    sm: 'text-sm sm:text-base tracking-[0.16em]',
    md: 'text-base sm:text-lg tracking-[0.18em]',
    lg: 'text-xl sm:text-2xl tracking-[0.2em]',
    xl: 'text-2xl sm:text-3xl tracking-[0.22em]',
    '2xl': 'text-3xl sm:text-4xl tracking-[0.24em]',
  };

  const subtitleSizes = {
    xs: 'text-[7px] tracking-[0.24em]',
    sm: 'text-[8px] sm:text-[9px] tracking-[0.26em]',
    md: 'text-[9px] sm:text-[10px] tracking-[0.28em]',
    lg: 'text-[10px] sm:text-xs tracking-[0.3em]',
    xl: 'text-xs sm:text-sm tracking-[0.32em]',
    '2xl': 'text-sm sm:text-base tracking-[0.34em]',
  };

  const currentIconHeight = iconHeightPx[size];

  // Render Image without any border, box or shadow frame
  const renderChairImage = (h: number, customClass = '') => (
    <img
      src={logoSrc}
      alt="Barda Home"
      style={{ height: h, width: 'auto' }}
      className={`object-contain transition-transform duration-200 select-none ${customClass}`}
      referrerPolicy="no-referrer"
      onError={(e) => {
        const target = e.currentTarget;
        if (target.src.indexOf('barda_chair.jpg') === -1 && target.src.indexOf('barda_chair_icon.svg') === -1) {
          target.src = '/barda_chair_icon.svg';
        }
      }}
    />
  );

  if (variant === 'icon-only') {
    return (
      <div className={`inline-flex items-center justify-center select-none ${className}`}>
        {renderChairImage(currentIconHeight)}
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div className={`inline-flex flex-col items-center text-center select-none ${className}`}>
        {renderChairImage(currentIconHeight * 1.15, 'mb-2')}
        <span
          className={`font-black text-[#2E180E] uppercase leading-tight font-sans ${titleSizes[size]}`}
        >
          {titleText}
        </span>
        {showSubtitle && (
          <span
            className={`font-bold text-[#BA6E35] uppercase mt-1 font-sans ${subtitleSizes[size]}`}
          >
            {subtitleText}
          </span>
        )}
      </div>
    );
  }

  // Default: Horizontal layout (Icon on left + 2-line Text on right, completely borderless)
  return (
    <div className={`inline-flex items-center gap-3.5 select-none ${className}`}>
      {renderChairImage(currentIconHeight)}
      <div className="flex flex-col justify-center items-start text-left">
        <span
          className={`font-black text-[#2E180E] uppercase leading-none font-sans ${titleSizes[size]}`}
        >
          {titleText}
        </span>
        {showSubtitle && (
          <span
            className={`font-bold text-[#BA6E35] uppercase mt-1 font-sans ${subtitleSizes[size]}`}
          >
            {subtitleText}
          </span>
        )}
      </div>
    </div>
  );
};

export const BardaLogoIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 44,
}) => {
  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <img
        src="/barda_chair_icon.svg"
        alt="Barda Home"
        style={{ height: size, width: 'auto' }}
        className="object-contain"
        referrerPolicy="no-referrer"
        onError={(e) => {
          const target = e.currentTarget;
          target.src = '/barda_chair.jpg';
        }}
      />
    </div>
  );
};

export default BardaLogo;
