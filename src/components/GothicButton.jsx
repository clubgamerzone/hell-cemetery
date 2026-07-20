import { Link } from 'react-router-dom';
import styles from './GothicButton.module.css';

const variantClass = {
  primary: '',
  secondary: styles['gothicButton--secondary'],
  ghost: styles['gothicButton--ghost'],
};

const sizeClass = {
  small: styles['gothicButton--small'],
  medium: '',
  large: styles['gothicButton--large'],
};

export default function GothicButton({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  to,
  href,
  type = 'button',
  className = '',
  ...props
}) {
  const classes = [
    styles.gothicButton,
    variantClass[variant],
    sizeClass[size],
    fullWidth ? styles['gothicButton--full'] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
