interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function Spinner({ size = 'md', text = 'Cargando...' }: SpinnerProps) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };
  
  return (
    <div className='flex flex-col items-center justify-center py-12 gap-3'>
      <svg className={`animate-spin text-blue-600 ${sizes[size]}`} fill='none' viewBox='0 0 24 24'>
        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
        <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
      </svg>
      {text && <p className='text-sm text-gray-500'>{text}</p>}
    </div>
  );
}