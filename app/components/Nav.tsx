'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import gsap from 'gsap';
import SocialIcon from './SocialIcon';
import SplitWords, { applyMask, releaseMask } from './SplitWords';
import data from '../data.json';

const { label, links, meta } = data.nav;
/*
  One list of socials and one address for the whole site, read from the
  contact panel's own copy, so the two places can never drift.
*/
const { socials, email } = data.contact;

/*
  The fixed olive circle and the panel it opens. The panel stays mounted so
  its contents can be animated rather than mounted — `visibility` (set in CSS)
  is what takes it out of the tab order while it is closed.

  The panel opens as a circle growing out of the toggle. Because the toggle
  sits in the top-right corner, the three quarters of that circle outside the
  viewport are never seen and it reads as a quarter arc sweeping down across
  the page. It is a clip-path, so the edge is hard — no blur, no soft mask.
*/
const Nav = () => {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      close();
      /* Escape gives focus back to the control that opened the panel */
      toggleRef.current?.focus();
    };

    /*
      Locking the body is what stops the page from scrolling underneath an
      open full-screen panel. The previous value is restored rather than
      cleared, so this composes with anything else that touches it.
    */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  /*
    What arrives inside the arc, in order: the links rise out of their own
    clip the way every heading on the page does, then the socials pop in
    behind them.

    fromTo rather than a parked start state, so nothing depends on what the
    last close left behind — every open plays from the same place.
  */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !open) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    applyMask(panel);

    const ctx = gsap.context(() => {
      /*
        Both are parked here rather than by a fromTo on their own beat: a
        fromTo added mid-timeline does not write its start value until it
        runs, which would leave them at rest for the frame before they move.
        Nothing is on screen yet to see it — the arc is still a zero-radius
        circle when this runs.
      */
      gsap.set('.nav__social', { scale: 0 });
      gsap.set(['.nav__email', '.nav__meta span'], { opacity: 0, y: 18 });

      /* the arc gets a head start, so the words rise into an open panel */
      const tl = gsap.timeline({ delay: 0.18 });

      tl.fromTo(
        '.nav__link .splitted__word-wrap',
        { yPercent: 120 },
        {
          yPercent: 0,
          duration: 0.9,
          stagger: 0.07,
          ease: 'expo.out',
          onComplete: () => releaseMask(panel),
        }
      );

      /* the address leads the right column, ahead of the icons under it */
      tl.to(
        '.nav__email',
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
        '-=0.45'
      );

      tl.to(
        '.nav__social',
        {
          scale: 1,
          duration: 0.5,
          stagger: 0.06,
          /* a touch of overshoot: they pop rather than grow */
          ease: 'back.out(2)',
        },
        '-=0.35'
      );

      /*
        The standing details come in last and quietly — a fade and a lift, the
        same move the copy under every other heading makes. Per line, so the
        two arrive one after the other rather than as one block.
      */
      tl.to(
        '.nav__meta span',
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
        },
        '-=0.3'
      );
    }, panel);

    return () => ctx.revert();
  }, [open]);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="nav__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : label}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <div
        id={panelId}
        ref={panelRef}
        className={`nav__panel${open ? ' is-open' : ''}`}
        /* hidden from AT while closed; `visibility` alone leaves it announced */
        aria-hidden={!open}
      >
        {/*
          Links left, everything you can reach me by right — the panel reads
          as two columns rather than one stack running down the left edge with
          the whole right half empty.
        */}
        <div className="nav__inner">
          <nav aria-label="Main">
            <ul className="nav__list">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    className="nav__link"
                    href={link.href}
                    tabIndex={open ? undefined : -1}
                    onClick={close}
                  >
                    {/* manual: the panel's own timeline drives these, not sight */}
                    <SplitWords manual>{link.label}</SplitWords>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav__aside">
            {/*
              The address the contact panel already carries, offered here so
              the menu is a way out of the page and not only around it.
            */}
            <a
              className="nav__email"
              href={`mailto:${email}`}
              tabIndex={open ? undefined : -1}
            >
              {email}
            </a>

            <ul className="nav__socials">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    className="nav__social"
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    tabIndex={open ? undefined : -1}
                  >
                    <SocialIcon name={s.label} />
                  </a>
                </li>
              ))}
            </ul>

            <p className="nav__meta">
              {meta.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Nav;
