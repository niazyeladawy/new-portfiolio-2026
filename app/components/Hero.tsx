import { useEffect } from 'react';
import { gsap } from 'gsap';
import data from '../data.json';

const {
  badge,
  name,
  description,
  roles,
  cta,
  ctaHref,
  scrollLabel,
} = data.hero;

interface HeroProps {
  startAnimation?: boolean;
}

const Hero = ({ startAnimation = false }: HeroProps) => {
  useEffect(() => {
    if (!startAnimation) return;

    const heroName = document.querySelector(
      '.hero-name'
    ) as HTMLElement | null;

    const heroWords = document.querySelectorAll(
      '.hero-name .wd'
    );

    if (!heroName || heroWords.length === 0) return;

    const tl = gsap.timeline();

    gsap.set('.hero-badge', { opacity: 0 });
    gsap.set('.hero-ticker', { opacity: 0 });
    gsap.set('.hero-desc', { opacity: 0, y: 30 });
    gsap.set('.hero-cta', { opacity: 0, y: 30 });
    gsap.set('.scroll-ind', { opacity: 0, y: 30 });

    const finalRect = heroName.getBoundingClientRect();

    gsap.set(heroName, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      xPercent: -50,
      yPercent: -50,
      margin: 0,
      opacity: 1,
      zIndex: 10,
    });

    const centerRect = heroName.getBoundingClientRect();
    const moveX = finalRect.left - centerRect.left;
    const moveY = finalRect.top - centerRect.top;

    gsap.set('.hero-name .wd', { yPercent: 120 });

    tl.to('.hero-name .wd', {
      yPercent: 0,
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.12,
    });

    tl.to(heroName, {
      x: moveX,
      y: moveY,
      duration: 1.3,
      ease: 'power4.out',
    });

    tl.add(() => {
      gsap.set(heroName, {
        clearProps:
          'position,top,left,xPercent,yPercent,x,y,zIndex,margin',
      });
    });

    let tickerIndex = 1;
    let resetTimeout: number | null = null;
    let tickerInterval: number | null = null;

    tl.add(() => {
      tickerInterval = window.setInterval(() => {
        gsap.to('.hero-ticker-track', {
          y: `-${tickerIndex * 1.2}em`,
          duration: 0.6,
          ease: 'expo.inOut',
        });
        tickerIndex++;
        if (tickerIndex >= roles.length + 1) {
          resetTimeout = window.setTimeout(() => {
            gsap.set('.hero-ticker-track', { y: 0 });
            tickerIndex = 1;
          }, 650);
        }
      }, 2500);
    });

    tl.to({}, { duration: 0.15 });

    tl.to('.hero-badge', {
      opacity: 1,
      duration: 0.6,
      ease: 'power2.out',
    })
      .fromTo(
        '.hero-badge-text',
        { x: -8, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: 'expo.out' },
        '<'
      )
      .fromTo(
        '.hero-badge-line',
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
        '.hero-ticker',
        { opacity: 1, duration: 0.5, ease: 'power2.out' },
        '-=0.4'
      )
      .to(
        '.hero-desc',
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
        },
        '-=0.2'
      )
      .to(
        '.hero-cta',
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
        },
        '-=0.6'
      )
      .to(
        '.scroll-ind',
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
        },
        '<0.1'
      );

    const cta = document.querySelector(
      '.hero-cta'
    ) as HTMLElement | null;
    let onMouseMove: ((e: MouseEvent) => void) | null = null;

    if (cta && window.innerWidth >= 900) {
      onMouseMove = (e: MouseEvent) => {
        const rect = cta.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 120;
        if (dist < radius) {
          const strength = (1 - dist / radius) * 10;
          gsap.to(cta, {
            x: dx * strength * 0.12,
            y: dy * strength * 0.12,
            duration: 0.4,
            ease: 'power2.out',
          });
        } else {
          gsap.to(cta, {
            x: 0,
            y: 0,
            duration: 0.5,
            ease: 'expo.out',
          });
        }
      };
      window.addEventListener('mousemove', onMouseMove);
    }

    return () => {
      tl.kill();
      if (tickerInterval !== null) window.clearInterval(tickerInterval);
      if (resetTimeout) window.clearTimeout(resetTimeout);
      if (onMouseMove) {
        window.removeEventListener('mousemove', onMouseMove);
      }
    };
  }, [startAnimation]);

  return (
    <section id="hero">
      <div className="hero-badge">
        <span className="hero-badge-dot"></span>
        <span className="hero-badge-text">{badge}</span>
        <span className="hero-badge-line"></span>
      </div>

      <div className="hero-ticker">
        <span className="hero-ticker-track">
          {roles.map((r) => (
            <span key={r}>{r}</span>
          ))}
          <span aria-hidden="true">{roles[0]}</span>
        </span>
      </div>

      <h1 className="hero-name">
        <span className="ln">
          <span className="wd hero-name-first">{name.first}</span>
        </span>
        <span className="ln">
          <span className="wd hero-name-last">{name.last}</span>
        </span>
      </h1>

      <div className="hero-foot">
        <p className="hero-desc">{description}</p>

        <a href={ctaHref} className="hero-cta">
          <span className="hero-cta-text">{cta}</span>
          <span className="hero-cta-icon">↗</span>
        </a>

        <div className="scroll-ind">
          <div className="s-line"></div>
          <span>{scrollLabel}</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;
