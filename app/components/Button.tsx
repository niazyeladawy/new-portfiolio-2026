'use client';

import { ArrowUpRight } from 'lucide-react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

/*
  The system's one button. The sweep fill lives entirely in CSS (.button::after
  rides up and rounds off on hover) — this component only picks the variant and
  keeps the label inside .button__text so it stays above the fill.
*/

type Variant = 'primary' | 'red' | 'ink' | 'secondary';

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  /* the trailing 45° arrow; off for form submits and other terminal actions */
  arrow?: boolean;
  compact?: boolean;
  className?: string;
};

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> & {
    href: string;
  };

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined;
  };

type ButtonProps = ButtonAsLink | ButtonAsButton;

const classesFor = (variant: Variant, compact: boolean, extra?: string) =>
  ['button', `button--${variant}`, compact ? 'button--compact' : '', extra ?? '']
    .filter(Boolean)
    .join(' ');

const Label = ({ children, arrow }: { children: ReactNode; arrow: boolean }) => (
  <span className="button__text">
    {children}
    {arrow ? (
      <ArrowUpRight
        className="button__icon"
        size={24}
        strokeWidth={2}
        aria-hidden="true"
      />
    ) : null}
  </span>
);

const Button = ({
  children,
  variant = 'red',
  arrow = true,
  compact = false,
  className,
  ...rest
}: ButtonProps) => {
  if (typeof rest.href === 'string') {
    const { href, ...anchorProps } = rest as ButtonAsLink;
    return (
      <a href={href} className={classesFor(variant, compact, className)} {...anchorProps}>
        <Label arrow={arrow}>{children}</Label>
      </a>
    );
  }

  const { type = 'button', ...buttonProps } = rest as ButtonAsButton;
  return (
    <button type={type} className={classesFor(variant, compact, className)} {...buttonProps}>
      <Label arrow={arrow}>{children}</Label>
    </button>
  );
};

export default Button;
