import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface BardaLogoIconProps {
  className?: string;
  size?: number;
  interactive?: boolean;
}

export const BardaLogoIcon: React.FC<BardaLogoIconProps> = ({ className = '', size = 38, interactive = false }) => {
  const [logoSrc, setLogoSrc] = useState<string>('/barda_logo.jpg');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const custom = localStorage.getItem('barda_custom_logo');
    if (custom) {
      setLogoSrc(custom);
    }

    const handleLogoChange = () => {
      const updated = localStorage.getItem('barda_custom_logo');
      if (updated) {
        setLogoSrc(updated);
      } else {
        setLogoSrc('/barda_logo.jpg');
      }
    };

    window.addEventListener('storage', handleLogoChange);
    window.addEventListener('barda_logo_updated', handleLogoChange);
    return () => {
      window.removeEventListener('storage', handleLogoChange);
      window.removeEventListener('barda_logo_updated', handleLogoChange);
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen (PNG, JPG, SVG, WebP)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          localStorage.setItem('barda_custom_logo', result);
          setLogoSrc(result);
          window.dispatchEvent(new Event('barda_logo_updated'));
          setShowUploadModal(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    localStorage.removeItem('barda_custom_logo');
    setLogoSrc('/barda_logo.jpg');
    window.dispatchEvent(new Event('barda_logo_updated'));
    setShowUploadModal(false);
  };

  return (
    <>
      <div 
        className={`relative inline-block shrink-0 ${interactive ? 'cursor-pointer group' : ''}`}
        onClick={interactive ? () => setShowUploadModal(true) : undefined}
        title={interactive ? 'Haz clic para cambiar el logo (Subir PNG/JPG)' : undefined}
      >
        <img
          src={logoSrc}
          alt="Barda Home Logo"
          style={{ width: size, height: size }}
          className={`object-contain rounded-md transition-opacity ${interactive ? 'group-hover:opacity-80' : ''} ${className}`}
          onError={() => setLogoSrc('/barda_logo.jpg')}
          referrerPolicy="no-referrer"
        />
        {interactive && (
          <div className="absolute inset-0 bg-brown/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center text-white">
            <Upload className="w-4 h-4" />
          </div>
        )}
      </div>

      {showUploadModal && (
        <div 
          className="fixed inset-0 bg-brown/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setShowUploadModal(false); }}
        >
          <div 
            className="bg-white border-2 border-sand rounded-2xl max-w-sm w-full p-5 shadow-2xl relative flex flex-col gap-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <div className="flex items-center gap-2 text-brown font-serif font-bold text-base">
                <ImageIcon className="w-4 h-4 text-terra" />
                <span>Cambiar Logo de Barda</span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowUploadModal(false)}
                className="text-stone hover:text-brown p-1 rounded-lg hover:bg-cream"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 py-2">
              <div className="w-24 h-24 border border-sand rounded-xl p-2 bg-light-cream/40 flex items-center justify-center">
                <img src={logoSrc} alt="Preview Logo" className="max-w-full max-h-full object-contain" />
              </div>
              <p className="text-xs text-stone">
                Sube tu logo oficial en formato <strong>PNG (con transparencia)</strong> o <strong>JPG</strong>. Se aplicará a la cabecera, presupuestos, remitos y órdenes.
              </p>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/png, image/jpeg, image/webp, image/svg+xml"
              onChange={handleFileSelect}
              className="hidden" 
            />

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-terra hover:bg-brown text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Seleccionar imagen PNG / JPG</span>
              </button>

              <button
                type="button"
                onClick={handleResetLogo}
                className="w-full py-2 bg-cream hover:bg-sand/40 text-brown text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar logo por defecto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface BardaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'horizontal' | 'vertical';
  showSubtitle?: boolean;
  titleText?: string;
  subtitleText?: string;
  className?: string;
  interactive?: boolean;
}

export const BardaLogo: React.FC<BardaLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  showSubtitle = true,
  titleText = 'Barda Home',
  subtitleText = 'MODERN FURNITURE',
  className = '',
  interactive = true,
}) => {
  const iconSizes = {
    sm: 28,
    md: 38,
    lg: 52,
    xl: 72,
  };

  const titleSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  const iconPx = iconSizes[size];

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <BardaLogoIcon size={iconPx} interactive={interactive} />
        <span className={`font-serif font-bold text-brown tracking-tight leading-none mt-1.5 ${titleSizes[size]}`}>
          {titleText}
        </span>
        {showSubtitle && (
          <span className={`font-sans tracking-widest text-terra font-bold uppercase mt-1 ${subtitleSizes[size]}`}>
            {subtitleText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <BardaLogoIcon size={iconPx} interactive={interactive} />
      <div className="flex flex-col justify-center items-start text-left">
        <span className={`font-serif font-bold text-brown tracking-tight leading-none text-left ${titleSizes[size]}`}>
          {titleText}
        </span>
        {showSubtitle && (
          <span className={`font-sans tracking-widest text-terra font-bold uppercase mt-1 text-left block ${subtitleSizes[size]}`}>
            {subtitleText}
          </span>
        )}
      </div>
    </div>
  );
};

export default BardaLogo;
