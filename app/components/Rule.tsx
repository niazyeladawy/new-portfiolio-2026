'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import revealOnSight from '../lib/reveal';

/*
  The start state has to be written before the browser paints, or the rule
  shows itself at full width for a frame and then collapses to draw again. On
  the server there is no layout to run it against, so the import is swapped
  rather than guarded at the call site.
*/
const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface RuleProps {
  /* the rule's own look — width, height, colour — lives on this class */
  className?: string;
  duration?: number;
  /* seconds to hold after the rule comes into sight */
  delay?: number;
  /*
    Passed through to revealOnSight. '0px' for a rule anchored to the foot of
    the page, which has nothing below it to scroll up through and so would
    never clear the default blind spot.
  */
  rootMargin?: string;
  /*
    Draw nothing on its own: park it closed and let the parent's timeline take
    it, for a rule that is one beat of a longer intro rather than a reaction
    to scroll. Same arrangement SplitWords offers, for the same reason.
  */
  manual?: boolean;
}

/*
  A hairline that draws itself open from the middle.

  One line, two places — the divider above the contact legal row and the
  hairline beside the hero badge — and the pair only reads as one gesture if
  the origin, the ease and the duration stay identical, which is exactly the
  sort of thing that drifts when it is copied. Hence a component: the shape
  is the caller's (see the className), the motion is not.

  transform-origin lives on .rule in globals.css, not here, so the still frame
  under reduced motion is correct without JS running at all.
*/
const Rule = ({
  className,
  duration = 0.9,
  delay = 0,
  rootMargin,
  manual = false,
}: RuleProps) => {
  const ref = useRef<HTMLSpanElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    /*
      Reduced motion leaves the rule exactly as rendered: drawn, full width,
      nothing to undo. It is simply there.
    */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (manual) {
      gsap.set(el, { scaleX: 0 });
      return () => {
        gsap.set(el, { clearProps: 'transform' });
      };
    }

    return revealOnSight(
      el,
      [el],
      { scaleX: 0 },
      { scaleX: 1, duration, delay, ease: 'expo.out' },
      rootMargin
    );
  }, [manual, duration, delay, rootMargin]);

  return (
    <span
      ref={ref}
      className={className ? `rule ${className}` : 'rule'}
      aria-hidden="true"
    />
  );
};

export default Rule;
