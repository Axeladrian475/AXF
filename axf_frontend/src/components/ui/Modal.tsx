import { useEffect } from 'react';
import type {ReactNode} from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, size = 'md', children }: ModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else        document.body.style.overflow = 'unset';
    
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl',
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      {/* Overlay oscuro */}
      <div className='absolute inset-0 bg-black/50' onClick={onClose} />
      
      {/* Caja del modal */}
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}>
        <div className='flex items-center justify-between p-5 border-b'>
          <h2 className='text-lg font-semibold text-gray-800'>{title}</h2>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600 text-xl font-bold leading-none'>
            &times;
          </button>
        </div>
        
        <div className='overflow-y-auto p-5 flex-1'>
          {children}
        </div>
      </div>
    </div>
  );
}