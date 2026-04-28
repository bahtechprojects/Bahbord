interface LogoProps {
  className?: string;
  /** Apenas o ícone "b!" em vez do logotipo completo */
  iconOnly?: boolean;
  alt?: string;
}

/**
 * Logo Bah!Flow com troca automática de cor entre temas.
 * Usa duas <img> sobrepostas + classes dark:hidden/hidden dark:block
 * pra mostrar a versão correta sem JS.
 */
export default function Logo({ className = '', iconOnly = false, alt = 'Bah!Flow' }: LogoProps) {
  const lightSrc = iconOnly ? '/bahflow-favicon.svg' : '/bahflow-logo.svg';
  const darkSrc = iconOnly ? '/bahflow-favicon-dark.svg' : '/bahflow-logo-dark.svg';

  return (
    <>
      <img src={lightSrc} alt={alt} className={`${className} block dark:hidden`} />
      <img src={darkSrc} alt={alt} aria-hidden="true" className={`${className} hidden dark:block`} />
    </>
  );
}
