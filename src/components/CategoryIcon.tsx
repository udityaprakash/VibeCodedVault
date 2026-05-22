import React from 'react';
import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ 
  name, 
  className = '', 
  size = 18,
  color
}) => {
  // Resolve Lucide icon by its string name
  const IconComponent = (Icons as any)[name];

  if (!IconComponent) {
    // Return a fallback Zap icon if name not found
    const Fallback = Icons.Zap;
    return <Fallback className={className} size={size} style={color ? { color } : undefined} />;
  }

  return <IconComponent className={className} size={size} style={color ? { color } : undefined} />;
};
