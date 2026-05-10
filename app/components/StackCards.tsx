'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import data from '../data.json';

gsap.registerPlugin(ScrollTrigger);

type StackCard = {
  num: string;
  title: string;
  description: string;
  link?: string;
  links?: { label: string; href: string }[];
  image: string;
  bg: string;
  accent: string;
};

const CARDS: StackCard[] = data.stackCards.items as StackCard[];
const { sectionLabel, viewProjectLabel } = data.stackCards;

const StackCards = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];

    if (!section || cards.length === 0) return;

    const ctx = gsap.context(() => {
      /*
        Cards 1+ start translated below the viewport —
        they slide upward into the stack as the card above exits.
      */
      gsap.set(cards.slice(1), {
        y: () => window.innerHeight,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: `+=${(cards.length - 1) * 100}%`,
          pin: true,
          scrub: 1,
        },
      });

      cards.forEach((card, i) => {
        if (i === cards.length - 1) return;

        /*
          Drive the active card through three exact transform stops
          tied to scroll progress, leaning back and fading out.
        */
        tl.to(
          card,
          {
            keyframes: {
              '0%': {
                x: 0,
                y: 0,
                opacity: 1,
                visibility: 'inherit',
              },
              '50%': {
                x: 0,
                y: 0,
                z: 0,
                rotation: 0.8255,
                rotationX: 9.32,
                scale: 0.9301,
                opacity: 1,
                visibility: 'inherit',
              },
              '100%': {
                rotation: 3.54276,
                rotationX: 40,
                scale: 0.7,
                opacity: 0,
                visibility: 'inherit',
              },
              easeEach: 'none',
            },
            duration: 1,
            force3D: true,
          },
          i
        );

        /*
          Enter the next card on the same scroll segment, mirroring
          the exit's 0% / 50% / 100% pacing so they resolve in lockstep.
          The 50% stop holds the card mostly below the viewport while
          the outgoing card barely moves, then both finish together.
        */
        tl.to(
          cards[i + 1],
          {
            keyframes: {
              '0%': { y: () => window.innerHeight },
              '50%': { y: () => window.innerHeight * 0.9301 },
              '100%': { y: 0 },
              easeEach: 'none',
            },
            duration: 1,
            force3D: true,
          },
          i
        );

        /*
          Flip the outgoing card to visibility: hidden only after the
          incoming card has reached y: 0. Kept out of the keyframes
          because GSAP applies non-interpolatable values at segment
          boundaries, which was flipping visibility too early.
        */
        tl.set(card, { visibility: 'hidden' }, i + 1);
      });

      ScrollTrigger.refresh();
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <div data-nosnippet>
    <section ref={sectionRef} id="projects" className="sc-section">
      {/* perspective lives on this wrapper so rotateX feels 3D */}
      <div className="sc-wrap">
        {CARDS.map((card, i) => (
          <div
            key={card.num}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="sc-card"
            style={{
              background: card.bg,
              zIndex: i,
            }}
          >
            <div className="sc-card-body">
              <header className="sc-card-head">
                <div className="sc-card-label">
                  <span
                    className="sc-card-num"
                    style={{ color: card.accent }}
                  >
                    {card.num}
                  </span>

                  <span
                    className="sc-card-rule"
                    style={{ background: card.accent }}
                  />

                  <span className="sc-card-section"  style={{ color: card.accent }}>
                    {sectionLabel}
                  </span>
                </div>
              </header>

              <div className="sc-card-content">
                <h2 className="sc-card-title" style={{ color: card.accent }}>{card.title}</h2>
                <img
                  className="sc-card-img-inline"
                  src={`/${card.image}`}
                  alt=""
                  aria-hidden="true"
                  onError={(e) => {
                    e.currentTarget.style.visibility = 'hidden';
                  }}
                />
              </div>

              <div className="sc-card-foot">
                <p
                  className="sc-card-desc"
                  style={{ color: card.accent }}
                >
                  {card.description}
                </p>

                {card.link ? (
                  <a
                    className="sc-card-cta"
                    href={card.link}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: card.accent }}
                  >
                    <span className="sc-card-cta-text">{viewProjectLabel}</span>
                    <span
                      className="sc-card-cta-icon"
                      aria-hidden="true"
                      style={{ background: card.accent }}
                    >
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </span>
                  </a>
                ) : null}

                {card.links?.length ? (
                  <ul className="sc-card-sublinks">
                    {card.links.map((l) => (
                      <li key={l.href}>
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: card.accent }}
                        >
                          {l.label}
                          <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <img
              className="sc-card-img"
              src={`/${card.image}`}
              alt=""
              aria-hidden="true"
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden';
              }}
            />

            {/* decorative ghosted number */}
            {/* <span className="sc-card-ghost" aria-hidden="true">
              {card.num}
            </span> */}
          </div>
        ))}
      </div>
    </section>
    </div>
  );
};

export default StackCards;
