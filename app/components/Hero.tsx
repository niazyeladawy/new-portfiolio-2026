'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Button from './Button';
import Rule from './Rule';
import SplitWords, { releaseMask } from './SplitWords';
import data from '../data.json';

const { badge, role, location, name, description, roles, cta, ctaHref, scrollLabel } =
  data.hero;

interface HeroProps {
  startAnimation?: boolean;
}

/*
  The badge and the role ticker above the name are parked, not deleted — the
  copy, the CSS and the intro beats that bring them in are all still here.
  Flip this back to true to put them back.
*/
const SHOW_TOP = false;

/*
  Lightblue full-bleed panel, ranged along the centre line. The name is set in
  viewport units so it bleeds edge to edge at every width, and it arrives one
  line at a time — the one big move on the page, everything else fades in
  behind it.
*/
const Hero = ({ startAnimation = false }: HeroProps) => {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!startAnimation) return;

    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      const firstLine = root.querySelector<HTMLElement>('.hero__name-first');
      const lastLine = root.querySelector<HTMLElement>('.hero__name-last');
      if (!firstLine || !lastLine) return;

      const firstWord = firstLine.querySelector('.splitted__word-wrap');
      const lastWord = lastLine.querySelector('.splitted__word-wrap');
      if (!firstWord || !lastWord) return;

      /*
        Reduced motion still needs the end state — every one of these starts
        at opacity 0 in CSS, so skipping the timeline would leave a blank
        panel rather than a still one. The name is not among them: its words
        rest in the markup and SplitWords leaves them alone under reduce.
      */
      if (reduced) {
        gsap.set(
          [
            '.hero__badge',
            '.hero__badge-text',
            '.hero__ticker',
            '.hero__meta',
            '.hero__desc',
            '.hero__cta',
            '.hero__scroll',
          ],
          { opacity: 1, x: 0, y: 0 }
        );
        gsap.set('.hero__badge-line', { scaleX: 1 });
        return;
      }

      const tl = gsap.timeline();

      /*
        The name arrives one line at a time. Both rise out of their own clip
        the way every other heading on the page does; the second overlaps the
        first by most of its travel, so it reads as one move in two beats
        rather than two animations in a queue.

        SplitWords parked the words below the line already — restated so the
        beat reads on its own.
      */
      gsap.set([firstWord, lastWord], { yPercent: 120 });

      tl.to(firstWord, {
        yPercent: 0,
        duration: 1.1,
        ease: 'expo.out',
        /* the clip is only wanted while the words travel — see globals.css */
        onComplete: () => releaseMask(firstLine),
      });

      tl.to(
        lastWord,
        {
          yPercent: 0,
          duration: 1.1,
          ease: 'expo.out',
          onComplete: () => releaseMask(lastLine),
        },
        '-=0.7'
      );

      /*
        The second line also opens out as it lands: it comes in set tight and
        relaxes to the face's own spacing. Negative, so the word arrives
        compressed and spreads into place — 0.04em closes the gaps to almost
        nothing, which on a face already this condensed is as tight as it goes
        before the letters start to overlap and read as a rendering fault.

        It starts at 0.55, the midpoint of the 1.1s rise, rather than with it.
        fromTo writes its start value at build time, so the line holds the
        tight setting for the first half of its travel — while it is still
        mostly behind the clip — and only begins to spread once it is properly
        in view. Running past the end of the rise, the letters are still
        opening after the line has stopped moving.
      */
      tl.fromTo(
        lastWord,
        { letterSpacing: '-0.04em' },
        { letterSpacing: '0em', duration: 1.4, ease: 'expo.out' },
        '<0.55'
      );

      if (SHOW_TOP) {
        tl.to('.hero__badge', { opacity: 1, duration: 0.6, ease: 'power2.out' })
          .fromTo(
            '.hero__badge-text',
            { x: -8, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.7, ease: 'expo.out' },
            '<'
          )
          .fromTo(
            '.hero__badge-line',
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.6,
              ease: 'expo.out',
              transformOrigin: 'left center',
            },
            '<0.2'
          )
          .to(
            '.hero__ticker',
            { opacity: 1, duration: 0.5, ease: 'power2.out' },
            '-=0.4'
          );
      }

      /*
        The overlap is measured against the beat before it: the ticker when
        the top is up, otherwise the name's own tracking tween, which the copy
        starts under rather than waiting out.
      */
      /*
        The byline sits above the name but arrives after it — the name is the
        one big move on this panel and everything else fades in behind it, so
        leading with the label would spend the opening beat on the smallest
        thing on screen.

        Labels first and the rule drawing under them, following the order they
        sit in; 0.9s on expo.out is the contact divider's exact figure.
      */
      tl.to(
        '.hero__meta',
        { opacity: 1, duration: 0.6, ease: 'power2.out' },
        SHOW_TOP ? '-=0.2' : '-=1.1'
      );

      tl.to(
        '.hero__meta-rule',
        { scaleX: 1, duration: 0.9, ease: 'expo.out' },
        '<0.15'
      );

      tl.fromTo(
        '.hero__desc',
        { y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
        '<0.3'
      )
        .fromTo(
          '.hero__cta',
          { y: 30 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
          '-=0.6'
        )
        .fromTo(
          '.hero__scroll',
          { y: 30 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
          '<0.1'
        );

      /* the role ticker rolls one line per beat, then snaps back to the top */
      let index = 1;
      let resetTimeout: number | null = null;
      let interval: number | null = null;

      if (SHOW_TOP) {
        tl.add(() => {
          interval = window.setInterval(() => {
            gsap.to('.hero__ticker-track', {
              y: `-${index * 1.2}em`,
              duration: 0.6,
              ease: 'expo.inOut',
            });
            index += 1;
            if (index >= roles.length + 1) {
              resetTimeout = window.setTimeout(() => {
                gsap.set('.hero__ticker-track', { y: 0 });
                index = 1;
              }, 650);
            }
          }, 2500);
        });
      }

      return () => {
        if (interval !== null) window.clearInterval(interval);
        if (resetTimeout !== null) window.clearTimeout(resetTimeout);
      };
    }, root);

    return () => ctx.revert();
  }, [startAnimation]);

  return (
    /*
      The page inset lives on .hero__inner, not on the section, so the panel
      itself stays full bleed to the edges.

      No dome here: the hero is the first panel, so nothing arrives into it.
      The arc at its foot belongs to About, which draws its own.
    */
    <section id="hero" ref={rootRef}>
      <div className="hero__inner">
        {SHOW_TOP ? (
          <div className="hero__top">
            <div className="hero__badge">
              <span className="hero__badge-dot" aria-hidden="true" />
              <span className="hero__badge-text">{badge}</span>
              <span className="hero__badge-line" aria-hidden="true" />
            </div>

            <div className="hero__ticker">
              {/*
                The track holds one extra copy of the first role so the roll to
                the end lands on it before the silent reset back to zero.
              */}
              <span className="hero__ticker-track">
                {roles.map((role) => (
                  <span key={role}>{role}</span>
                ))}
                <span aria-hidden="true">{roles[0]}</span>
              </span>
            </div>
          </div>
        ) : null}

        {/*
          What the parked badge used to say, split across the ends of its own
          line — the device the contact panel closes the page with, so the two
          ends of the page rhyme rather than each inventing a way to set a
          small label.

          Above the name: it introduces who this is, and a byline reads before
          the name it belongs to, not after it.
        */}
        <p className="hero__meta">
          {/* out of flow against the top edge, so the two labels still sit either end */}
          <Rule className="hero__meta-rule" manual />

          <span>{role}</span>
          <span>{location}</span>
        </p>

        {/*
          The words use the same split-and-rise as every other heading on the
          page. `manual` hands them to the intro timeline below, where the
          rise is one beat of a longer move; without the intro they fall back
          to revealing themselves on sight, like every other heading.
        */}
        <h1 className="hero__name">
          <SplitWords className="ln hero__name-first" manual={startAnimation}>
            {name.first}
          </SplitWords>
          <SplitWords className="ln hero__name-last" manual={startAnimation}>
            {name.last}
          </SplitWords>
        </h1>

        <div className="hero__foot">
          <p className="hero__desc">{description}</p>

          <div className="hero__cta">
            {/*
              ctaHref is an in-page anchor, so the arrow points down rather
              than out — and agrees with the scroll cue a few pixels below it
              instead of contradicting it.
            */}
            <Button href={ctaHref} variant="ink" direction="down">
              {cta}
            </Button>
          </div>

          <div className="hero__scroll" aria-hidden="true">
            <span className="hero__scroll-line" />
            <span>{scrollLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
