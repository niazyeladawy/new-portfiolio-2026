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
  How long the panel stays on screen after `open` goes false. It does not
  leave with the state — globals.css closes the clip-path over this long and
  only then does `visibility` take it away — so anything torn down before it
  is torn down in plain sight. Has to agree with the transition on
  .nav__panel; the two are one decision.
*/
const CLOSE_MS = 720;

/*
  The toggle rides at --nav-toggle-top, which is set to clear the hero byline.
  The moment the page moves at all that row starts leaving, and the offset
  stops paying for anything — so the toggle comes up to
  --nav-toggle-top-raised on the first real scroll rather than at some
  landmark further down.

  80px is about one notch of a wheel, and less than the byline's own block, so
  it lands while the reader is still in the gesture that started it.

  RAISE_BAND is hysteresis, and it is not optional. Scrolling settles on a
  threshold as often as it crosses it, and without a band the class flickers
  on and off there — which reads as the toggle wobbling rather than moving.
*/
const RAISE_AT = 80;
const RAISE_BAND = 24;
const RAISED = 'is-nav-raised';

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

  /*
    A close that has not finished yet: the context that opened the panel, and
    the timer that reverts it once the panel is off screen. Held in a ref so a
    reopen inside that window can settle it rather than let the two overlap.
  */
  const closing = useRef<{ ctx: gsap.Context; timer: number } | null>(null);

  const settleClose = useCallback(() => {
    const pending = closing.current;
    if (!pending) return;

    window.clearTimeout(pending.timer);
    /*
      Reverting early is safe here and only here: it parks the words back
      below their line, which is where the fromTo about to run starts them
      anyway, so the frame it lands on is the frame it was going to draw.
    */
    pending.ctx.revert();
    closing.current = null;
  }, []);

  /* the timer must not outlive the component */
  useEffect(() => settleClose, [settleClose]);

  useEffect(() => {
    const root = document.documentElement;
    /*
      Mirrors the class rather than reading it back off the DOM, so a scroll
      event that changes nothing costs a comparison instead of a class write
      and the style recalculation behind it.
    */
    let raised = false;

    const sync = () => {
      /* the band is only spent coming back down — going up, the mark is the mark */
      const next = window.scrollY > (raised ? RAISE_AT - RAISE_BAND : RAISE_AT);
      if (next === raised) return;

      raised = next;
      root.classList.toggle(RAISED, next);
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });

    return () => {
      window.removeEventListener('scroll', sync);
      root.classList.remove(RAISED);
    };
  }, []);

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

    /* reopened before the last close finished tidying up */
    settleClose();

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

    /*
      Not `ctx.revert()`. This runs the moment `open` goes false, and the
      panel is still on screen for CLOSE_MS after that — reverting here snaps
      every word back below its line, the socials back to scale 0 and the
      address back down its 18px, all of it in view, as one jump at the top of
      the close. Wait until the panel is actually gone, and none of it is
      seen; a reopen before then is handled by settleClose above.
    */
    return () => {
      closing.current = {
        ctx,
        timer: window.setTimeout(() => {
          ctx.revert();
          closing.current = null;
        }, CLOSE_MS),
      };
    };
  }, [open, settleClose]);

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
