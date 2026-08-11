'use client';

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SectionDome from './SectionDome';
import SplitWords from './SplitWords';
import revealOnSight from '../lib/reveal';
import data from '../data.json';

gsap.registerPlugin(ScrollTrigger);

/* start states have to land before the first paint; the server has no layout */
const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const { stats, tags, chapters } = data.about;

/*
  Ivory ground. The section pins for 150% of its own height while three
  chapters cross-fade in place on the left and the stats/tag block holds
  steady on the right — the accent rail down the left edge is the only
  read-out of how far through the pin you are.
*/
const About = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const [activeChapter, setActiveChapter] = useState(1);

  /*
    The stats are driven by sight, not by a measured scroll position — see
    lib/reveal. This section pins at `top top`, and a trigger inside a pinned
    element is exactly where a measured start lands late: the stats would show
    at rest, snap to opacity 0, then animate back in. The start states are
    written here instead, before the section is ever painted.

    Kept out of the gsap.context below on purpose. Every set the context sees
    is undone by its revert, and the tween these fire arrives long after the
    context has stopped recording — the two would not clean up as a pair.
  */
  useIsoLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    /* reduced motion leaves the stats exactly as rendered */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const stats = section.querySelector('#about-stats');

    const stops = [
      revealOnSight(
        stats,
        section.querySelectorAll('.about__stat-value'),
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: 'power3.out' }
      ),
      revealOnSight(
        stats,
        section.querySelectorAll('.about__stat-label'),
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.12,
          delay: 0.1,
          ease: 'power3.out',
        }
      ),
    ];

    return () => stops.forEach((stop) => stop());
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const fill = fillRef.current;

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=150%',
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const ch = progress < 0.34 ? 1 : progress < 0.67 ? 2 : 3;
          setActiveChapter((prev) => (prev !== ch ? ch : prev));
          if (fill) fill.style.height = `${progress * 100}%`;
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const wrap = document.getElementById('about-tags');
    if (!wrap) return;

    /* the tags deal themselves in once, on first sight, then stop observing */
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        wrap
          .querySelectorAll('.about__tag')
          .forEach((tag, i) =>
            window.setTimeout(() => tag.classList.add('is-visible'), i * 40)
          );
        io.disconnect();
      },
      { threshold: 0.2 }
    );

    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/*
        Ivory rising out of the lightblue hero. It sits outside the section
        rather than inside it: #about is exactly one viewport tall and pins at
        `top top`, so an arc within it would eat screen height for the whole
        pin. Out here it has finished opening by the time the pin starts.
      */}
      <SectionDome tone="ivory" from="lightblue" />

      <section id="about" ref={sectionRef} className="shell">
        <div className="about__rail" aria-hidden="true">
          <div className="about__rail-fill" ref={fillRef} />
        </div>

        <div className="about__grid">
          <div className="about__left">
            <div className="about__chapters">
              {chapters.map((ch, i) => (
                <article
                  key={ch.num}
                  className={`about__chapter${activeChapter === i + 1 ? ' is-active' : ''}`}
                  /* only the chapter on screen is announced; the rest are stale */
                  aria-hidden={activeChapter !== i + 1}
                >
                  <h3 className="about__chapter-title">
                    <SplitWords>
                      {ch.lines.map((ln, j) => (
                        <Fragment key={j}>
                          {j > 0 && <br />}
                          {ln.text}
                          {ln.italic ? <em>{ln.italic}</em> : null}
                        </Fragment>
                      ))}
                    </SplitWords>
                  </h3>
                  <p className="about__chapter-body">{ch.body}</p>
                </article>
              ))}
            </div>

            <div className="about__dots" aria-hidden="true">
              {chapters.map((ch, i) => (
                <span
                  key={ch.num}
                  className={`about__dot${activeChapter === i + 1 ? ' is-active' : ''}`}
                />
              ))}
            </div>
          </div>

          <div className="about__right">
            <div className="about__stats" id="about-stats">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="about__stat-value">{s.value}</div>
                  <div className="about__stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="about__tags" id="about-tags">
              {tags.map((t) => (
                <span className="about__tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default About;
