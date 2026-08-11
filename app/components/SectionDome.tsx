'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/*
  The panel colours, by the same names the .panel--* utilities use. The dome
  never names a colour itself — `tone` and `from` resolve to classes and the
  stylesheet does the lookup, so the palette stays in :root.
*/
export type Tone =
  | 'ivory'
  | 'sand'
  | 'olive'
  | 'lightblue'
  | 'red'
  | 'yellow'
  | 'green';

interface SectionDomeProps {
  /* the ground of the section arriving — what the arc is filled with */
  tone: Tone;
  /* the panel above — what the shoulders show until the arc swallows them */
  from: Tone;
}

/* ── the shape ─────────────────────────────────────────────────────────────
  A section opens as a half dome and fills its box as you scroll, so the new
  colour swallows the strip of the previous panel still showing at the
  shoulders.

  The apex therefore stays pinned at the top and the *sides* are what move:

    M{x},0 C{x-554},0 0,{s} 0,{s} L0,404 H1511 L1511,{s} S{x+554},0 {x},0 Z

  s = 404 is the resting half dome. The two L commands are zero-length and
  collinear there, so the shape reduces exactly to
  M755.5,0C201.5,0,0,404,0,404H1511S1309.5,0,755.5,0Z.

  s = 0 puts both curves' control points and endpoints flat on y = 0, which
  degenerates them into straight lines: the box becomes a filled rectangle.

  One number drives it, so the morph is a plain numeric tween — no
  path-interpolation plugin and no stored keyframes.
*/
const DOME_W = 1511;
const DOME_H = 404;
const DOME_APEX_X = 755.5;
const DOME_CTRL = 554;

export const domePath = (side: number) =>
  `M${DOME_APEX_X},0C${DOME_APEX_X - DOME_CTRL},0,0,${side},0,${side}` +
  `L0,${DOME_H}H${DOME_W}L${DOME_W},${side}` +
  `S${DOME_APEX_X + DOME_CTRL},0,${DOME_APEX_X},0Z`;

/*
  Every section enters the same way, so the arc is a component rather than a
  shape each one redraws. Drop it immediately above the section it belongs to,
  in normal flow — it is the transition between two panels, so it needs the
  full width of the page and a scroll length of its own to open across. That
  also keeps it clear of pinned and sticky sections: it has scrolled past
  before they ever stick, so it costs them no viewport height and covers none
  of their content.
*/
const SectionDome = ({ tone, from }: SectionDomeProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const path = pathRef.current;
    if (!root || !path) return;

    /*
      Reduced motion keeps the half dome — the arc is the section's own shape
      rather than decoration, and the markup already renders it that way, so
      there is nothing to undo.
    */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      /*
        A proxy number is tweened rather than reading self.progress directly:
        `scrub` smooths the value it feeds an animation, and that smoothing is
        the difference between the shape growing and it snapping to the scroll
        position.

        The range ends at `top top`: the box is full by the time the dome's own
        top edge reaches the top of the viewport, which is the last moment the
        shoulders are still on screen to be filled.
      */
      const state = { side: DOME_H };

      gsap.to(state, {
        side: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: root,
          start: 'top bottom',
          end: 'top top',
          scrub: 0.6,
        },
        onUpdate: () => path.setAttribute('d', domePath(state.side)),
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    /*
      Rendered as the half dome — the resting shape, and what a visitor sees
      before the script runs or when it never does. `tone` fills the arc (the
      path takes currentColor); `from` is the ground behind it, reusing the
      panel utility so the two never resolve a colour differently.
    */
    <div
      ref={rootRef}
      className={`dome dome--${tone} panel--${from}`}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${DOME_W} ${DOME_H}`}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path ref={pathRef} fill="currentColor" d={domePath(DOME_H)} />
      </svg>
    </div>
  );
};

export default SectionDome;
