'use client';

import { ArrowDown, ArrowUpRight } from 'lucide-react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

/*
  The system's one button. The sweep fill lives entirely in CSS (.button::after
  rides up and rounds off on hover) — this component only picks the variant and
  keeps the label inside .button__text so it stays above the fill.
*/

type Variant = 'primary' | 'red' | 'ink' | 'secondary';

/*
  Where the button sends you, which is what the arrow is there to say.

  'out' — the 45° arrow, the system's outbound mark: this leaves the page.
  'down' — a plain down arrow, for an in-page anchor. The distinction is not
  decoration; an up-and-right arrow on a link that scrolls the page downward
  points away from its own destination.
*/
type Direction = 'out' | 'down';

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  /* the trailing arrow; off for form submits and other terminal actions */
  arrow?: boolean;
  direction?: Direction;
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

const classesFor = (
  variant: Variant,
  compact: boolean,
  direction: Direction,
  extra?: string
) =>
  [
    'button',
    `button--${variant}`,
    compact ? 'button--compact' : '',
    /* the hover nudge has to travel the same way the arrow points */
    direction === 'down' ? 'button--down' : '',
    extra ?? '',
  ]
    .filter(Boolean)
    .join(' ');

const Label = ({
  children,
  arrow,
  direction,
}: {
  children: ReactNode;
  arrow: boolean;
  direction: Direction;
}) => {
  const Icon = direction === 'down' ? ArrowDown : ArrowUpRight;
  return (
    <span className="button__text">
      {children}
      {arrow ? (
        <Icon className="button__icon" size={24} strokeWidth={2} aria-hidden="true" />
      ) : null}
    </span>
  );
};

const Button = ({
  children,
  variant = 'red',
  arrow = true,
  direction = 'out',
  compact = false,
  className,
  ...rest
}: ButtonProps) => {
  const classes = classesFor(variant, compact, direction, className);

  if (typeof rest.href === 'string') {
    const { href, ...anchorProps } = rest as ButtonAsLink;
    return (
      <a href={href} className={classes} {...anchorProps}>
        <Label arrow={arrow} direction={direction}>
          {children}
        </Label>
      </a>
    );
  }

  const { type = 'button', ...buttonProps } = rest as ButtonAsButton;
  return (
    <button type={type} className={classes} {...buttonProps}>
      <Label arrow={arrow} direction={direction}>
        {children}
      </Label>
    </button>
  );
};

export default Button;
