import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function Icon({ name, className = '', style }: IconProps) {
  return (
    <span 
      className={`material-symbols-outlined select-none align-middle ${className}`} 
      style={style}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
