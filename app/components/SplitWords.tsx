'use client';

import {
  Fragment,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';

/*
  The from-state has to be written before the browser paints, or the heading
  shows itself for a frame and then drops back below the line to rise again.
  useLayoutEffect does that; on the server there is no layout to run it
  against, so the import is swapped rather than guarded at every call site.
*/
const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const WORD = 'splitted__word';
const WRAP = 'splitted__word-wrap';

/*
  Flatten children into one word per entry. Text nodes split on whitespace;
  an element — <em> for the emphasised word — is one word whole, so its
  underline and colour survive the split. <br> passes through as a break.
*/
const isBreak = (node: ReactNode) => isValidElement(node) && node.type === 'br';

const toWords = (node: ReactNode, out: ReactNode[]) => {
  if (node === null || node === undefined || typeof node === 'boolean') return;

  if (Array.isArray(node)) {
    node.forEach((child) => toWords(child, out));
    return;
  }

  if (typeof node === 'string' || typeof node === 'number') {
    String(node)
      .split(/\s+/)
      .filter(Boolean)
      .forEach((word) => out.push(word));
    return;
  }

  /* a fragment is not a word, it is the list it holds */
  if (isValidElement(node) && node.type === Fragment) {
    toWords((node.props as { children?: ReactNode }).children, out);
    return;
  }

  out.push(node);
};

interface SplitWordsProps {
  children: ReactNode;
  className?: string;
  /* seconds between one word leaving and the next */
  stagger?: number;
  duration?: number;
  delay?: number;
  /*
    Render the words and park them below the line, but start nothing: the
    parent's own timeline drives them and calls releaseMask when it lands.
    For the hero, where the reveal is one beat of the page's intro rather
    than a reaction to scroll.
  */
  manual?: boolean;
}

/*
  The clip is only wanted while the words are travelling — see globals.css for
  why it cannot stay. A parent driving its own reveal puts it back before each
  run and takes it off when the words land.
*/
export const applyMask = (root: ParentNode) =>
  root
    .querySelectorAll(`.${WORD}`)
    .forEach((word) => word.classList.add('is-masked'));

export const releaseMask = (root: ParentNode) =>
  root
    .querySelectorAll(`.${WORD}`)
    .forEach((word) => word.classList.remove('is-masked'));

/*
  Heading entry, everywhere. Each word rides in a box of its own and rises
  into it from 120% below, one after the next.

  An IntersectionObserver starts it rather than a ScrollTrigger. The reveal is
  a one-shot that must not be missed — a heading that never plays is a heading
  that never appears — and the headings sit inside pinned and sticky sections
  where a trigger's measured start is the fragile part. IO answers the only
  question being asked, "is this on screen yet", and needs no refresh to keep
  answering it correctly.
*/
const SplitWords = ({
  children,
  className,
  stagger = 0.08,
  duration = 1,
  delay = 0,
  manual = false,
}: SplitWordsProps) => {
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const wraps = gsap.utils.toArray<HTMLElement>(`.${WRAP}`, root);
    if (wraps.length === 0) return;

    /*
      Reduced motion leaves the resting markup exactly as rendered: no mask,
      no offset, nothing to undo. The heading is simply there.
    */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const mask = (on: boolean) =>
      root
        .querySelectorAll(`.${WORD}`)
        .forEach((word) => word.classList.toggle('is-masked', on));

    mask(true);
    gsap.set(wraps, { yPercent: 120 });

    if (manual) {
      return () => {
        mask(false);
        gsap.set(wraps, { clearProps: 'transform' });
      };
    }

    let tween: gsap.core.Tween | null = null;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();

        tween = gsap.to(wraps, {
          yPercent: 0,
          duration,
          stagger,
          delay,
          ease: 'expo.out',
          onComplete: () => mask(false),
        });
      },
      /* ≈ the bottom 15% of the viewport is a blind spot, so the words are
         already moving by the time the heading is properly in the frame */
      { rootMargin: '0px 0px -15% 0px' }
    );

    io.observe(root);

    return () => {
      io.disconnect();
      tween?.kill();
      mask(false);
      gsap.set(wraps, { clearProps: 'transform' });
    };
  }, [manual, stagger, duration, delay]);

  const parts: ReactNode[] = [];
  toWords(children, parts);

  return (
    <span ref={rootRef} className={className}>
      {parts.map((part, i) =>
        isBreak(part) ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <Fragment key={i}>
            {/*
              The gap between words sits outside the clipped box. Inside it a
              trailing space is collapsed away by the inline-flex, and the
              words in a line run together.
            */}
            {i > 0 && !isBreak(parts[i - 1]) ? ' ' : null}
            <span className={WORD}>
              <span className={WRAP}>{part}</span>
            </span>
          </Fragment>
        )
      )}
    </span>
  );
};

export default SplitWords;
