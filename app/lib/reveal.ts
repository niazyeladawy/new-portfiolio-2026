import gsap from 'gsap';

/*
  Reveal-on-sight.

  An IntersectionObserver, not a ScrollTrigger. A reveal is a one-shot whose
  start state must be in place before the element is ever painted, and a
  trigger cannot promise that: its start is a measured scroll position, and
  with pinned and sticky sections above it that measurement lands late. The
  tween then fires while the content is already on screen — you see it at
  rest, watch it snap to opacity 0, and watch it come back. Deferring the
  start state (immediateRender: false) is what makes that visible rather than
  merely wrong, and writing it up front instead only trades the flash for
  content that stays invisible when a trigger never fires at all.

  IO answers the only question a reveal is actually asking — "is this on
  screen yet" — needs no refresh to keep answering it, and cannot be thrown
  off by a pin. The start state is written here, on setup, so nothing is ever
  seen at rest first.

  Callers own the reduced-motion check: skipping the call leaves the markup
  exactly as rendered, which is the correct still frame.
*/
export const revealOnSight = (
  /* the element whose arrival starts it — usually the group's wrapper */
  watch: Element | null,
  targets: ArrayLike<Element>,
  from: gsap.TweenVars,
  to: gsap.TweenVars,
  /*
    ≈ the bottom 12% of the viewport is a blind spot, so the move has begun by
    the time the group is properly in frame.

    It is a blind spot in the literal sense: anything that can never be
    scrolled clear of it never fires at all. Pass '0px' for a group anchored
    to the foot of the page, which has nothing below it to scroll up through.
  */
  rootMargin = '0px 0px -12% 0px'
): (() => void) => {
  const items = Array.from(targets);
  if (!watch || items.length === 0) return () => {};

  gsap.set(items, from);

  let tween: gsap.core.Tween | null = null;

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries[0]?.isIntersecting) return;
      io.disconnect();
      tween = gsap.to(items, to);
    },
    { rootMargin }
  );

  io.observe(watch);

  return () => {
    io.disconnect();
    tween?.kill();
    gsap.set(items, { clearProps: Object.keys(from).join(',') });
  };
};

export default revealOnSight;
