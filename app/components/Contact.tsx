'use client';

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Button from './Button';
import SectionDome from './SectionDome';
import SocialIcon from './SocialIcon';
import SplitWords from './SplitWords';
import revealOnSight from '../lib/reveal';
import data from '../data.json';

const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const { email, headlineLines, socials, lead, form, blocks, legalLeft, legalRight } =
  data.contact;

/*
  The form is parked, not deleted. Until there is somewhere for a message to
  go, the email block and the socials below are the whole of the call to
  action; flip this back to true to bring the fields back.
*/
const SHOW_FORM = false;

/*
  One closing block, one colour. The yellow rises out of the red panel above
  as a dome that draws itself open on scroll, and everything below it — the
  offer, the form, the contact details, the socials, the legal line — sits on
  that single panel.

  Ink throughout: on yellow it reads at 10:1, where the white the system
  allows for display type would be 1.5:1.

  There is no backend, so the form hands the message to the visitor's mail
  client rather than pretending to POST somewhere — a form that silently
  swallows a message is worse than no form.
*/
const Contact = () => {
  const rootRef = useRef<HTMLElement | null>(null);
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [message, setMessage] = useState('');

  /*
    Every reveal in this section is driven by sight, not by a measured scroll
    position — see lib/reveal. The start states are written on mount, before
    the panel is ever painted, so nothing is shown at rest and then snapped
    away to animate back in.

    useLayoutEffect so those start states land before the first paint. The
    import is swapped by environment rather than guarded at the call site;
    there is no layout to run against on the server.
  */
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    /*
      Reduced motion leaves the markup exactly as rendered — no start states
      to write and nothing to undo. The section is simply there.
    */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const q = (selector: string) => root.querySelectorAll(selector);

    /*
      The panel is one row now — headline and lead on the left, the details
      rail opposite — so every group crosses the sighting line in the same
      frame and, left alone, they all land together.

      The delays below are what keeps it reading as steps: each group waits
      out the one before it, so the panel assembles top-left to bottom-right
      instead of arriving in a single lump. They are offsets from each group's
      own sighting, not one shared timeline, so when the row stacks on a phone
      and the groups genuinely do arrive at different moments, each still gets
      its beat rather than firing early against a clock that started above the
      fold.
    */
    const stops = [
      revealOnSight(
        root.querySelector('#contact-lead'),
        q('#contact-lead'),
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, delay: 0.3, ease: 'power3.out' }
      ),

      /*
        The details rail, label then value, block by block. A comma selector
        resolves in document order, so the stagger runs EMAIL → the address →
        BASED IN → the city rather than both labels and then both values.
      */
      revealOnSight(
        root.querySelector('.contact__details'),
        q('.contact__detail-label, .contact__detail-value'),
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.12,
          delay: 0.55,
          ease: 'power3.out',
        }
      ),

      /*
        The same pop the nav's socials make, so the two sets read as one set.
        Held until the rail above it has finished stepping through — four
        items at 0.12 — so the row does not overlap itself.
      */
      revealOnSight(
        root.querySelector('.contact__socials'),
        q('.contact__social-link'),
        { scale: 0 },
        { scale: 1, duration: 0.5, stagger: 0.09, delay: 1.05, ease: 'back.out(2)' }
      ),

      /*
        The rule draws out from the middle, and the two lines follow it in.
        Both watch the same element, so the gap between them is fixed rather
        than depending on where each one happens to sit.

        These close the ladder, so they wait out the socials above them: 1.05
        to start plus three at 0.09 plus the pop itself. Sighting alone would
        not do it — the legal row clears the bottom of the viewport in the
        same frame as the rest of the panel, so without the hold it draws
        while the rail above is still stepping through.

        No bottom blind spot for these two: the legal row is the last thing on
        the page, so at full scroll it still sits inside the default one and
        would never come into sight at all.
      */
      revealOnSight(
        root.querySelector('.contact__legal'),
        q('.contact__legal-rule'),
        { scaleX: 0 },
        { scaleX: 1, duration: 0.9, delay: 1.5, ease: 'expo.out' },
        '0px'
      ),

      revealOnSight(
        root.querySelector('.contact__legal'),
        q('.contact__legal-text'),
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          delay: 1.85,
          ease: 'power3.out',
        },
        '0px'
      ),
    ];

    return () => stops.forEach((stop) => stop());
  }, []);

  const mailto = () => {
    const subject = encodeURIComponent(
      name ? `Project enquiry — ${name}` : 'Project enquiry'
    );
    const body = encodeURIComponent(
      [message, '', name && `— ${name}`, from].filter(Boolean).join('\n')
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  /*
    Headline and lead travel together. With the form up they run full width
    above the two columns; with it parked they *become* the left column, so the
    details rail still has something to sit opposite instead of leaving the
    right half of the panel empty.
  */
  const intro = (
    <>
      {/*
        One SplitWords for the whole headline, not one per line: the stagger
        is meant to run straight through the sentence, and three of them would
        instead restart it at every line as that line came into view.

        The lines are broken with <br> for the same reason — SplitWords passes
        a break through, and a wrapper span per line would have to be a word.
        SplitWords owns the spaces between the words.
      */}
      <h2 className="contact__headline" id="contact-headline">
        <SplitWords>
          {headlineLines.map((line, i) => (
            <Fragment key={i}>
              {i > 0 ? <br /> : null}
              {line.words.map((word, j) =>
                line.italic ? <em key={j}>{word}</em> : word
              )}
            </Fragment>
          ))}
        </SplitWords>
      </h2>

      <p className="contact__lead" id="contact-lead">
        {lead}
      </p>
    </>
  );

  return (
    <section id="contact" ref={rootRef}>
      {/* yellow rising out of the red projects panel */}
      <SectionDome tone="yellow" from="red" />

      <div className="contact__body">
        {SHOW_FORM ? intro : null}

        <div
          className={`contact__grid${SHOW_FORM ? '' : ' contact__grid--noform'}`}
        >
          {SHOW_FORM ? null : <div className="contact__intro">{intro}</div>}

          {SHOW_FORM ? (
            <form
              className="contact__form"
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = mailto();
              }}
            >
              <div className="contact__row">
                <label className="sr-only" htmlFor="contact-name">
                  {form.namePlaceholder}
                </label>
                <input
                  id="contact-name"
                  className="input"
                  type="text"
                  placeholder={form.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />

                <label className="sr-only" htmlFor="contact-from">
                  {form.emailPlaceholder}
                </label>
                <input
                  id="contact-from"
                  className="input"
                  type="email"
                  placeholder={form.emailPlaceholder}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <label className="sr-only" htmlFor="contact-message">
                {form.messagePlaceholder}
              </label>
              <textarea
                id="contact-message"
                className="input"
                placeholder={form.messagePlaceholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />

              <div className="contact__submit">
                <Button type="submit" variant="ink" arrow={false}>
                  {form.submitLabel}
                </Button>
              </div>

              <p className="contact__note">{form.note}</p>
            </form>
          ) : null}

          <div className="contact__details">
            {blocks.map((block) => (
              <div key={block.label}>
                <div className="contact__detail-label">{block.label}</div>
                {block.href ? (
                  <a className="contact__detail-value" href={block.href}>
                    {block.value}
                  </a>
                ) : (
                  <div className="contact__detail-value">{block.value}</div>
                )}
              </div>
            ))}

            <ul className="contact__socials">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    className="contact__social-link"
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                  >
                    <SocialIcon name={s.label} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="contact__legal">
          {/* out of flow, so the two lines below still sit either end */}
          <span className="contact__legal-rule" aria-hidden="true" />

          <span className="contact__legal-text">
            © {new Date().getFullYear()} {legalLeft}
          </span>
          <span className="contact__legal-text">{legalRight}</span>
        </div>
      </div>
    </section>
  );
};

export default Contact;
