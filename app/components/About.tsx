'use client';

import {
  Fragment,
  useEffect,
  useRef,
  useState,
} from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import data from '../data.json';

gsap.registerPlugin(ScrollTrigger);

const { sectionLabel, stats, tags, chapters } = data.about;

const About = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const numRef = useRef<HTMLSpanElement | null>(null);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeChapter, setActiveChapter] = useState(1);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.from('#about-label .sec-label-num', {
        scrollTrigger: { trigger: section, start: 'top 80%' },
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
      });

      gsap.from('#about-label .sec-label-rule', {
        scrollTrigger: { trigger: section, start: 'top 80%' },
        scaleX: 0,
        transformOrigin: 'left',
        duration: 0.8,
        delay: 0.15,
        ease: 'power3.out',
      });

      gsap.from('#about-label .sec-label-text', {
        scrollTrigger: { trigger: section, start: 'top 80%' },
        x: -12,
        opacity: 0,
        duration: 0.7,
        delay: 0.2,
        ease: 'power3.out',
      });

      gsap.from('.stat-v', {
        scrollTrigger: { trigger: '#stats-row', start: 'top 90%' },
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
      });

      gsap.from('.stat-l', {
        scrollTrigger: { trigger: '#stats-row', start: 'top 90%' },
        y: 15,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        delay: 0.1,
        ease: 'power3.out',
      });

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
          const ch =
            progress < 0.34 ? 1 : progress < 0.67 ? 2 : 3;
          setActiveChapter((prev) => (prev !== ch ? ch : prev));

          if (fill) {
            fill.style.height = `${progress * 100}%`;
          }
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const els = chapterRefs.current.filter(
      Boolean
    ) as HTMLElement[];
    if (els.length === 0) return;

    els.forEach((el, i) => {
      const isActive = i + 1 === activeChapter;
      gsap.killTweensOf(el);
      if (isActive) {
        gsap.fromTo(
          el,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            delay: 0.1,
            ease: 'power2.out',
          }
        );
      } else {
        gsap.to(el, {
          opacity: 0,
          y: -20,
          duration: 0.4,
          ease: 'power2.out',
        });
      }
    });

    if (numRef.current) {
      gsap.fromTo(
        numRef.current,
        { y: 10, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          ease: 'power3.out',
        }
      );
    }
  }, [activeChapter]);

  useEffect(() => {
    const tagsWrap = document.getElementById('tags-wrap');
    if (!tagsWrap) return;

    const sio = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          tagsWrap
            .querySelectorAll('.s-tag')
            .forEach((t, i) =>
              setTimeout(() => t.classList.add('vis'), i * 40)
            );
          sio.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    sio.observe(tagsWrap);
    return () => sio.disconnect();
  }, []);

  const activeNum = String(activeChapter).padStart(2, '0');

  return (
    <section id="about" ref={sectionRef}>
      <div className="about-progress-rail" aria-hidden="true">
        <div
          className="about-progress-fill"
          ref={fillRef}
        ></div>
      </div>

      <div className="about-pinned">
        <div className="about-left">
          <div className="sec-label" id="about-label">
            <span className="sec-label-num" ref={numRef}>
              {activeNum}
            </span>
            <span className="sec-label-rule"></span>
            <span className="sec-label-text">{sectionLabel}</span>
          </div>

          <div className="about-chapters">
            {chapters.map((ch, i) => (
              <article
                key={ch.num}
                ref={(el) => {
                  chapterRefs.current[i] = el;
                }}
                className={`about-chapter${
                  activeChapter === i + 1 ? ' is-active' : ''
                }`}
                data-ch={i + 1}
              >
                <h3 className="about-ch-hl">
                  {ch.lines.map((ln, j) => (
                    <Fragment key={j}>
                      {j > 0 && <br />}
                      {ln.text}
                      {ln.italic ? <em>{ln.italic}</em> : null}
                    </Fragment>
                  ))}
                </h3>
                <p className="about-ch-body">{ch.body}</p>
              </article>
            ))}
          </div>

          <div
            className="about-chapter-dots"
            aria-hidden="true"
          >
            {chapters.map((ch, i) => (
              <span
                key={ch.num}
                className={`about-dot${
                  activeChapter === i + 1 ? ' is-active' : ''
                }`}
              ></span>
            ))}
          </div>
        </div>

        <div className="about-right">
          <div className="stats-row" id="stats-row">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="stat-v">{s.value}</div>
                <div className="stat-l">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="tags-wrap" id="tags-wrap">
            {tags.map((t) => (
              <span className="s-tag" key={t}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
