import React from 'react';

// Reemplaza el contenido de este return con el código de tu propio SVG.
// Asegúrate de que las props `className` y `...rest` se pasen al elemento <svg>.
const Logo = ({ className, ...rest }: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 50"
      className={className}
      {...rest}
    >
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="Poppins, sans-serif"
        fontSize="35"
        fontWeight="bold"
        fill="currentColor"
      >
        PlayApp
      </text>
    </svg>
  );
};

export default Logo;
