
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import data from '../data.json';

const { sectionNum, sectionLabel, email, headlineLines, socials, footer } =
  data.contact;

const Contact = () => {
  const ctaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    gsap.from('#contact-label > *', {
      scrollTrigger: {
        trigger: '#contact',
        start: 'top 75%',
      },
      y: 20,
      opacity: 0,
      duration: 0.7,
      stagger: 0.1,
      ease: 'power3.out',
    });

    const hl = document.getElementById('contact-hl');

    if (hl) {
      hl.innerHTML = headlineLines
        .map((line) => {
          const spans = line.words
            .map((w) => {
              const inner = line.italic
                ? `<em style="font-style:italic;color:var(--coral)">${w}</em>`
                : w;

              return `<span style="display:inline-block;overflow:hidden;vertical-align:bottom"><span style="display:inline-block;transform:translateY(115%)">${inner}</span></span>`;
            })
            .join(' ');

          return `<span style="display:block">${spans}</span>`;
        })
        .join('');

      gsap.to(hl.querySelectorAll('span span'), {
        scrollTrigger: {
          trigger: '#contact',
          start: 'top 70%',
        },
        y: 0,
        stagger: 0.1,
        duration: 0.95,
        ease: 'power3.out',
      });
    }

    const cta = ctaRef.current;

    if (cta) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            cta.style.opacity = '1';
            cta.style.transform = 'translateY(0)';
            io.disconnect();
          }
        },
        { threshold: 0.3 }
      );

      io.observe(cta);
    }
  }, []);

  return (
    <>
      <section id="contact">
        <div className="sec-label" id="contact-label">
          <span
            className="sec-label-num"
            style={{ color: 'var(--orange)' }}
          >
            {sectionNum}
          </span>

          <span
            className="sec-label-rule"
            style={{ background: 'rgba(245,241,232,.12)' }}
          ></span>

          <span
            className="sec-label-text"
            style={{ color: 'rgba(245,241,232,.35)' }}
          >
            {sectionLabel}
          </span>
        </div>

        <h2 className="contact-hl" id="contact-hl"></h2>

        <div
          ref={ctaRef}
          id="contact-cta"
          style={{
            opacity: 0,
            transform: 'translateY(20px)',
            transition: 'opacity .7s,transform .7s',
          }}
        >
          <a href={`mailto:${email}`} className="cta-link">
            {email} <span>→</span>
          </a>

          <div className="socials">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="soc-a"
                target="_blank"
                rel="noopener"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <span className="ft-l">© {new Date().getFullYear()} {footer.left}</span>
        <span className="ft-r">{footer.right}</span>
      </footer>
    </>
  );
};

export default Contact;
