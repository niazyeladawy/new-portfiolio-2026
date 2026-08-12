'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import * as THREE from 'three';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import SectionDome from './SectionDome';
import SplitWords from './SplitWords';
import data from '../data.json';

type Project = {
  num: string;
  title: string;
  description: string;
  link?: string;
  links?: { label: string; href: string }[];
  image: string;
  /* one of the system's product-card blocks — used by StackCards, not here */
  tone: string;
  short?: string;
  category?: string;
};

const ITEMS: Project[] = data.stackCards.items as Project[];
const COPY = data.projects3d;

/* ── scene constants ───────────────────────────────────────────── */
const RADIUS = 3.2;
/*
  The panel's shape, taken from the source images rather than chosen: every
  screenshot in data.json ships at 1920×821, and a panel cut to any other
  ratio can only cover-fit them — at the old 1.55-high panel that meant
  cropping 37% off the width of every capture, which is most of the layout the
  shot was taken to show.

  Width is not ours to pick: it is the arc a project owns on the ring, set by
  RADIUS, FILL and how many projects there are. So the height is what gives —
  see `height` in the effect, derived rather than declared.
*/
const PANEL_ASPECT = 1920 / 821;
const PANEL_Y = 0.5;
const LIFT = 0.26; // camera sits below the drum centre, so reflections get room
const FILL = 0.8; // slice of each angular step covered by an image
const FOV = 45;
const DRAG_PX_PER_ITEM = 300; // pointer travel that turns one project…
const DRAG_SWIPE_SHARE = 0.3; // …or this much of a narrow screen, if that is less
const TOUCH_INTENT_PX = 8; // travel before a touch is read as across or down
/* how much scroll a project is worth lives in CSS, as --p3d-per-project */
const END_HOLD = 0.8; // projects' worth of scroll spent parked on the last one
const SNAP_IDLE_MS = 160; // quiet time before the drum settles on a project
const HOVER_SCALE = 0.05; // how much the facing panel swells under the pointer
const MIRROR_GAP = 0.2; // world units of clear floor between a panel and its reflection
const TITLE_GAP = 0.34; // world units the title floats in front of the image
const TITLE_MAX = 0.17; // cap on title size, as a fraction of panel height
const TITLE_WRAP_AT = 0.1; // below this fraction, wrap onto a second line
const TITLE_FADE_AT = 2.2; // items from centre at which a title is fully gone
const SPEED_SCALE = 0.14; // how far the drum swells at full scroll speed
const SPEED_REF = 3200; // px/sec of scrolling treated as full speed
/* Fraction of the gap left after one second — smaller reacts faster. */
const SPEED_ATTACK = 1e-4; // builds quickly as you pick up speed
const SPEED_RELEASE = 0.45; // but takes its time coming back down

/*
  The scene has to paint colours the stylesheet owns — a WebGL clear colour or
  a canvas fillStyle cannot be a `var()`. Reading the tokens off :root at run
  time keeps the design system the single source of truth: no palette value is
  ever written twice, here or in globals.css.
*/
const token = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
};

/* the display face, spelled out: canvas cannot resolve --font-display */
const DISPLAY_STACK = "'Veneer', 'Anton', ui-sans-serif, system-ui, sans-serif";

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vWorldY;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldY = world.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/*
  Colour management is deliberately pass-through: the texture keeps its raw
  sRGB values and we never run `colorspace_fragment`, so a panel renders the
  exact pixels the browser would paint for the same <img>.
*/
const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;
  uniform vec2 uRepeat;
  uniform vec2 uOffset;
  uniform vec3 uFallback;
  uniform float uHasMap;
  uniform float uOpacity;
  uniform float uDim;
  uniform float uReflect;
  uniform float uFloor;
  uniform float uSpan;

  varying vec2 vUv;
  varying float vWorldY;

  void main() {
    vec2 uv = vUv * uRepeat + uOffset;
    vec3 col = mix(uFallback, texture2D(uMap, uv).rgb, uHasMap);
    float alpha = uOpacity;

    if (uReflect > 0.5) {
      float t = clamp((vWorldY - (uFloor - uSpan)) / uSpan, 0.0, 1.0);
      alpha *= pow(t, 2.4);
    }

    gl_FragColor = vec4(col * uDim, alpha);
  }
`;

/* Shortest signed distance from `i` to `pos` on a ring of `n` slots. */
const ringDelta = (i: number, pos: number, n: number) => {
  let d = (i - pos) % n;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* Break a title into two lines of as close to equal length as possible. */
const splitBalanced = (label: string) => {
  const words = label.split(/\s+/);
  if (words.length < 2) return [label];

  let at = 1;
  let best = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(
      words.slice(0, i).join(' ').length - words.slice(i).join(' ').length
    );
    if (diff < best) {
      best = diff;
      at = i;
    }
  }
  return [words.slice(0, at).join(' '), words.slice(at).join(' ')];
};

/* Word drawn across the curved panel — one canvas texture per project. */
const makeTitleTexture = (label: string, aspect: number) => {
  const width = 1024;
  const height = Math.round(width / aspect);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    /*
      0.78 rather than filling the band: the title sits nearer the camera
      than the image, so it projects a little larger than the panel beneath.
    */
    const maxWidth = width * 0.78;
    /* weight 400 and uppercase — the display face has one weight and one case */
    const font = (size: number) => `400 ${size}px ${DISPLAY_STACK}`;

    // canvas text scales linearly with font size, so one measurement fits it
    const fit = (rows: string[]) => {
      ctx.font = font(100);
      const widest = Math.max(...rows.map((r) => ctx.measureText(r).width));
      return Math.min(height * TITLE_MAX, (100 * maxWidth) / widest);
    };

    const caps = label.toUpperCase();
    let lines = [caps];
    let size = fit(lines);

    // a title too long to stay legible on one line breaks at its midpoint
    if (size < height * TITLE_WRAP_AT) {
      lines = splitBalanced(caps);
      size = fit(lines);
    }

    ctx.font = font(size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    /*
      The one soft edge in an otherwise flat system, and it is legibility
      rather than elevation: this is white display type laid over arbitrary
      project photography, where a light frame would swallow it. Ink from the
      palette, and it also sells the gap between the floating title and the
      image behind it.
    */
    ctx.shadowColor = token('--color-overlay', 'rgba(36, 36, 36, 0.5)');
    ctx.shadowBlur = size * 0.4;
    ctx.shadowOffsetY = size * 0.08;
    ctx.fillStyle = token('--color-white', '#FFFFFF');

    const lineHeight = size * 1.12;
    const first = height * 0.46 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) =>
      ctx.fillText(line, width / 2, first + i * lineHeight)
    );
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const ProjectsCarousel3D = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  /*
    The canvas gets its own host element that React never renders into.
    Appending it beside React-managed siblings makes React's commit throw
    NotFoundError when it inserts or removes those siblings.
  */
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  /* the round CTA that fades in over the facing panel */
  const viewRef = useRef<HTMLAnchorElement>(null);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const goToRef = useRef<(index: number) => void>(() => {});

  const count = ITEMS.length;
  const current = ITEMS[active];
  const href = current.link || current.links?.[0]?.href || '';

  const go = useCallback((index: number) => goToRef.current(index), []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvasHost = canvasHostRef.current;
    const track = trackRef.current;
    if (!stage || !canvasHost || !track) return;

    const step = (Math.PI * 2) / count;
    const arc = step * FILL;
    /*
      Arc length is the panel's width in world units. The height follows from
      it and PANEL_ASPECT, so a panel is exactly the shape of the image it
      carries and the cover-fit below has nothing left to crop.
    */
    const panelAspect = PANEL_ASPECT;
    const height = (RADIUS * arc) / panelAspect;
    const floor = PANEL_Y - height / 2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = 'p3d-canvas';
    canvasHost.appendChild(renderer.domElement);

    const drum = new THREE.Group();
    scene.add(drum);

    /*
      What a panel shows before its image lands. --color-border is the
      system's media-card placeholder, so an unloaded panel reads as an empty
      card rather than a hole in the drum.
    */
    const placeholder = new THREE.Color(token('--color-border', '#DBDED9'));
    const blank = new THREE.DataTexture(
      new Uint8Array([
        Math.round(placeholder.r * 255),
        Math.round(placeholder.g * 255),
        Math.round(placeholder.b * 255),
        255,
      ]),
      1,
      1
    );
    blank.needsUpdate = true;

    const geometry = new THREE.CylinderGeometry(
      RADIUS,
      RADIUS,
      height,
      48,
      1,
      true,
      -arc / 2,
      arc
    );
    /*
      The title rides a wider cylinder so it floats clearly in front of the
      image instead of looking painted on. Narrowing the arc by the same
      ratio keeps the band the same width as the panel underneath it.
    */
    const titleRadius = RADIUS + TITLE_GAP;
    const textArc = (arc * RADIUS) / titleRadius;
    const titleAspect = (titleRadius * textArc) / height;
    const textGeometry = new THREE.CylinderGeometry(
      titleRadius,
      titleRadius,
      height,
      48,
      1,
      true,
      -textArc / 2,
      textArc
    );

    const loader = new THREE.TextureLoader();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const disposables: { dispose: () => void }[] = [geometry, textGeometry, blank];

    type Panel = {
      mesh: THREE.Mesh;
      mirror: THREE.Mesh;
      title: THREE.Mesh;
      material: THREE.ShaderMaterial;
      mirrorMaterial: THREE.ShaderMaterial;
      titleMaterial: THREE.MeshBasicMaterial;
    };

    let dirty = true;
    let disposed = false;

    const makeMaterial = (reflect: boolean) =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        side: THREE.DoubleSide,
        transparent: reflect,
        depthWrite: !reflect,
        uniforms: {
          uMap: { value: blank },
          uRepeat: { value: new THREE.Vector2(1, 1) },
          uOffset: { value: new THREE.Vector2(0, 0) },
          uFallback: { value: placeholder.clone() },
          uHasMap: { value: 0 },
          uOpacity: { value: reflect ? 0.4 : 1 },
          uDim: { value: 1 },
          uReflect: { value: reflect ? 1 : 0 },
          uFloor: { value: floor },
          uSpan: { value: height },
        },
      });

    const panels: Panel[] = ITEMS.map((item, i) => {
      const material = makeMaterial(false);
      const mirrorMaterial = makeMaterial(true);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = PANEL_Y;
      mesh.rotation.y = i * step;
      mesh.userData.index = i;

      /*
        scale.y = -1 mirrors the panel through its own centre; dropping it by
        height lands the copy exactly under the floor line, and MIRROR_GAP
        pushes it further down so the two read as separate objects rather
        than one seam. The shader fades it out with distance.
      */
      const mirror = new THREE.Mesh(geometry, mirrorMaterial);
      mirror.position.y = PANEL_Y - height - MIRROR_GAP;
      mirror.scale.y = -1;
      mirror.rotation.y = i * step;
      mirror.renderOrder = -1;

      const titleMaterial = new THREE.MeshBasicMaterial({
        map: makeTitleTexture(item.title, titleAspect),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        opacity: 0,
      });
      const title = new THREE.Mesh(textGeometry, titleMaterial);
      title.position.y = PANEL_Y;
      title.rotation.y = i * step;
      title.renderOrder = 2;

      drum.add(mesh, mirror, title);
      disposables.push(material, mirrorMaterial, titleMaterial);
      if (titleMaterial.map) disposables.push(titleMaterial.map);

      loader.load(`/${item.image}`, (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.anisotropy = maxAniso;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        disposables.push(texture);

        // cover-fit the image inside the panel's arc-length × height box
        const imageAspect = texture.image.width / texture.image.height;
        const repeat = new THREE.Vector2(1, 1);
        const offset = new THREE.Vector2(0, 0);
        if (imageAspect > panelAspect) {
          repeat.x = panelAspect / imageAspect;
          offset.x = (1 - repeat.x) / 2;
        } else {
          repeat.y = imageAspect / panelAspect;
          offset.y = (1 - repeat.y) / 2;
        }

        for (const m of [material, mirrorMaterial]) {
          m.uniforms.uMap.value = texture;
          m.uniforms.uRepeat.value.copy(repeat);
          m.uniforms.uOffset.value.copy(offset);
          m.uniforms.uHasMap.value = 1;
        }
        dirty = true;
      });

      return { mesh, mirror, title, material, mirrorMaterial, titleMaterial };
    });

    /*
      Title size is derived from measured text, so a fallback font in the
      first paint would size it wrongly. Redraw once the real face lands.
    */
    document.fonts?.ready.then(() => {
      if (disposed) return;
      panels.forEach((panel, i) => {
        const stale = panel.titleMaterial.map;
        const fresh = makeTitleTexture(ITEMS[i].title, titleAspect);
        panel.titleMaterial.map = fresh;
        panel.titleMaterial.needsUpdate = true;
        disposables.push(fresh);
        stale?.dispose();
      });
      dirty = true;
    });

    /* ── camera framing ─────────────────────────────────────────── */
    /*
      Declared up here because `resize` reads it and runs immediately below —
      a `let` further down the effect would still be in its dead zone.
    */
    let startHold = 0; // projects' worth of scroll before the drum begins
    const resize = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!w || !h) return;

      /*
        Read here rather than per frame: it only changes with the breakpoint,
        and a breakpoint change is a resize.
      */
      startHold =
        parseFloat(
          getComputedStyle(track).getPropertyValue('--p3d-start-hold')
        ) || 0;

      const aspect = w / h;
      const tanHalfFov = Math.tan((FOV * Math.PI) / 360);
      const widthFraction = aspect > 1 ? 0.34 : 0.72;
      const heightFraction = aspect > 1 ? 0.5 : 0.4;

      /*
        Solve for the camera distance that makes the facing panel cover the
        intended share of the frame. The panel is a cylinder slice, so its
        silhouette edges sit further away than its centre — projecting the
        real edge (half = arc/2) instead of the flat chord keeps the framing
        honest at every aspect ratio.
      */
      const half = arc / 2;
      const edgeTan = widthFraction * tanHalfFov * aspect;
      const byWidth = RADIUS * Math.cos(half) + (RADIUS * Math.sin(half)) / edgeTan;
      const byHeight = RADIUS + height / (2 * heightFraction * tanHalfFov);

      /*
        The view stays level (no tilt); dropping the camera below the drum's
        centre just pushes the drum up the frame and reveals its reflection.
      */
      const eyeY = PANEL_Y - LIFT * height;
      camera.aspect = aspect;
      camera.position.set(0, eyeY, Math.max(byWidth, byHeight, RADIUS + 1.2));
      camera.lookAt(0, eyeY, 0);
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      dirty = true;
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(stage);

    /* ── rotation state ─────────────────────────────────────────── */
    let pos = 0; // fractional item index currently facing the camera
    let target = 0;
    let lastReported = 0;

    /*
      Scroll position is the single source of truth for rotation: the section
      is pinned with `position: sticky` inside a tall track, and progress
      through that track maps onto the item ring. Drag, buttons and keys all
      move the scroll rather than the drum, so no two inputs can disagree
      about where the carousel is.

      Pinning is native rather than ScrollTrigger's: its pin wraps the section
      in a spacer element, which moves the section out of the parent React
      renders into and makes React's own insert/remove calls throw
      NotFoundError. Sticky touches no DOM at all.
    */
    const span = count - 1;
    /*
      Every input lands on the page's scroll position:

        pos = scrollIdx (0→span, from the page) + offset

      `offset` is not an input of its own — it only carries the fraction the
      idle snap takes out to centre a project, so it never leaves ±0.5. Drag,
      buttons, keys and horizontal wheel all scroll the page instead, which
      keeps the drum and the scrollbar telling the same story and bounds the
      carousel at both ends: the first project is the first, the last is the
      last, and neither wraps around.
    */
    let offset = 0;
    let lastInputAt = 0;
    let lastScrollY = -1;
    let speedAmt = 0; // eased 0→1 measure of how fast the page is moving

    // total scrollable travel of the track while the section is stuck
    const travel = () => Math.max(0, track.offsetHeight - window.innerHeight);

    // page offset at which the section starts sticking
    const trackTop = () =>
      window.scrollY + track.getBoundingClientRect().top;

    /*
      The pinned travel is split three ways: a lead-in on the first project,
      one project's worth per turn, and the END_HOLD tail on the last one.
      The lead-in is read from the stylesheet, so a phone can hold the opening
      project for a scroll while a desktop starts turning at once.
    */
    const unit = () => travel() / (span + END_HOLD + startHold);
    const lead = () => unit() * startHold;
    const spinRange = () => unit() * span;
    const pxPerItem = () => unit();

    /* Page position that brings a given fractional project index to front. */
    const scrollForIndex = (index: number) =>
      trackTop() + lead() + THREE.MathUtils.clamp(index, 0, span) * unit();

    /* Scroll so that `index` faces the camera, clamped to the real ends. */
    const scrollToIndex = (index: number, smooth: boolean) => {
      /*
        The snap fraction is folded away rather than left to correct itself:
        an explicit index has to land on that exact project, not a rounding
        of it, and the page position is the truth from here on.
      */
      offset = 0;
      /*
        'instant' rather than 'auto' throughout: the page sets
        `scroll-behavior: smooth` globally, and 'auto' would inherit it —
        turning every frame of a drag into its own easing animation.
      */
      window.scrollTo({
        top: scrollForIndex(index),
        behavior: smooth ? 'smooth' : 'instant',
      });
      lastInputAt = performance.now();
      dirty = true;
    };

    /* Move the page by a distance measured in projects, ends included. */
    const scrollByItems = (items: number) => {
      const top = THREE.MathUtils.clamp(
        window.scrollY + items * pxPerItem(),
        scrollForIndex(0),
        scrollForIndex(span)
      );
      window.scrollTo({ top, behavior: 'instant' });
      lastInputAt = performance.now();
      dirty = true;
    };

    /*
      What a project costs in pointer travel. A thumb crosses a phone in far
      less than a mouse crosses a desktop, so the cost is capped at a share of
      the screen — under a third of the width on a phone, the full
      DRAG_PX_PER_ITEM as soon as the window is wide enough to afford it.
    */
    const dragPerItem = () =>
      Math.min(DRAG_PX_PER_ITEM, window.innerWidth * DRAG_SWIPE_SHARE);

    goToRef.current = (index) => scrollToIndex(index, true);

    /* ── pointer drag ───────────────────────────────────────────── */
    let dragging = false;
    let pointerId = -1;
    let startX = 0;
    let downX = 0;
    let downY = 0;
    let steering = false; // the gesture has taken the carousel over
    let startScroll = 0;
    let moved = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0; // items per second
    let hovered = false; // pointer is over the facing panel
    let hoverAmt = 0; // eased 0→1 driving the hover scale
    let hoverShown = 0; // last value written to the stage's hover class

    const el = renderer.domElement;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      pointerId = e.pointerId;
      startX = lastX = downX = e.clientX;
      downY = e.clientY;
      startScroll = window.scrollY;
      moved = 0;
      velocity = 0;
      /*
        A finger has to prove it means to turn the drum; a mouse never does.
        A vertical swipe still delivers pointermove before the browser claims
        the gesture, and those moves are sideways by a pixel or two — enough
        for a drag that scrolls the page to drag it straight back to where the
        touch landed. That is what pins the reader inside the section: every
        attempt to swipe out lands back on the carousel.
      */
      steering = e.pointerType !== 'touch';
      lastT = performance.now();
      el.setPointerCapture(pointerId);
      stage.classList.add('is-dragging');
    };

    /* Hand the gesture back to the page and stop steering the carousel. */
    const yieldToPage = () => {
      dragging = false;
      steering = false;
      stage.classList.remove('is-dragging');
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
    };

    const onMove = (e: PointerEvent) => {
      // hover runs on every move, drag or not, so it must precede the guard
      hovered = !dragging && pickIndex(e) === facingIndex();

      /*
        The CTA *is* the cursor over the facing panel, so its position is
        written here rather than tweened: anything eased would trail the
        pointer, and a cursor that lags reads as a dropped frame.

        Two custom properties instead of an inline transform, so CSS keeps
        ownership of the rest of it — the scale on reveal and the parked
        position under keyboard focus would both be clobbered by a transform
        written from here every move.
      */
      const cursor = viewRef.current;
      if (cursor) {
        const rect = el.getBoundingClientRect();
        cursor.style.setProperty('--p3d-cursor-x', `${e.clientX - rect.left}px`);
        cursor.style.setProperty('--p3d-cursor-y', `${e.clientY - rect.top}px`);
      }

      if (!dragging || e.pointerId !== pointerId) return;
      const fromDownX = e.clientX - downX;
      const fromDownY = e.clientY - downY;
      moved = Math.max(moved, Math.abs(fromDownX), Math.abs(fromDownY));

      if (!steering) {
        // still undecided — too small a movement to read either way
        if (moved < TOUCH_INTENT_PX) return;
        // more down the screen than across it: the page owns this gesture
        if (Math.abs(fromDownY) >= Math.abs(fromDownX)) return yieldToPage();
        // taking over from here, so measure from here — no jump at the switch
        steering = true;
        startX = lastX = e.clientX;
        startScroll = window.scrollY;
      }

      const dx = e.clientX - startX;
      /*
        Dragging scrolls the page rather than spinning the drum on its own,
        so the scrollbar follows the hand — and the clamp is what stops the
        drag at the first and last project instead of looping past them.
      */
      window.scrollTo({
        top: THREE.MathUtils.clamp(
          startScroll - (dx / dragPerItem()) * pxPerItem(),
          scrollForIndex(0),
          scrollForIndex(span)
        ),
        behavior: 'instant',
      });

      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) {
        velocity = -(e.clientX - lastX) / dragPerItem() / (dt / 1000);
        lastT = now;
        lastX = e.clientX;
      }
      lastInputAt = now;
      dirty = true;
    };

    const endDrag = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const wasSteering = steering;
      yieldToPage();
      if (moved < 6) return; // a tap — onClick deals with it
      // a swipe the page took, or one that never picked a direction
      if (!wasSteering) return;

      /*
        The flick chooses which project to land on rather than adding free
        spin: thrown hard it carries to the next one or two, released gently
        it settles on whichever is already nearest. Measured off `pos`, so it
        lands on the panel you are actually looking at.
      */
      const flick = THREE.MathUtils.clamp(velocity * 0.22, -1.2, 1.2);
      scrollToIndex(Math.round(pos + flick), true);
    };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const meshes = panels.map((p) => p.mesh);

    const facingIndex = () => ((Math.round(pos) % count) + count) % count;

    /* Panel under the pointer, or -1. */
    const pickIndex = (e: { clientX: number; clientY: number }) => {
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(meshes, false)[0];
      return hit ? (hit.object.userData.index as number) : -1;
    };

    const onClick = (e: MouseEvent) => {
      if (moved >= 6) return;
      const index = pickIndex(e);
      if (index < 0) return;

      const facing = facingIndex();
      if (index === facing) {
        const item = ITEMS[index];
        const url = item.link || item.links?.[0]?.href;
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        goToRef.current(index);
      }
    };

    const onWheel = (e: WheelEvent) => {
      /*
        Vertical wheel already rotates the drum by scrolling the pinned page.
        Only a horizontal gesture needs translating into scroll distance.
      */
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      scrollByItems(e.deltaX / 260);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') scrollToIndex(Math.round(pos) + 1, true);
      else if (e.key === 'ArrowLeft') scrollToIndex(Math.round(pos) - 1, true);
      else return;
      e.preventDefault();
    };

    const onLeave = () => {
      hovered = false;
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('click', onClick);
    el.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('keydown', onKey);

    /*
      The pill's tracks are driven off the same fractional `pos` as the drum,
      not off the settled index — so a scroll too small to snap still nudges
      the card by the matching fraction and the two never look out of step.
    */
    const rollSlides = pillRef.current
      ? Array.from(
          pillRef.current.querySelectorAll<HTMLElement>('.p3d-roll-slide')
        ).map((el) => ({ el, i: Number(el.dataset.i) }))
      : [];

    /* ── render loop ────────────────────────────────────────────── */
    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        dirty = true;
      },
      { threshold: 0 }
    );
    io.observe(stage);

    let raf = 0;
    let prev = performance.now();

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min((now - prev) / 1000, 0.1);
      prev = now;
      if (!visible) return;

      // scroll position → facing item, measured fresh every frame
      const y = window.scrollY;
      const dy = lastScrollY < 0 ? 0 : y - lastScrollY;
      if (y !== lastScrollY) {
        lastScrollY = y;
        lastInputAt = now;
        dirty = true;
      }

      const range = travel();
      /*
        Scroll spent inside the turning stretch, so the lead-in on the first
        project is subtracted before anything is mapped. Rotation also
        finishes before the pin does: mapped across the whole track, the last
        project would only arrive on the final pixel of scroll, and momentum
        carries you out of the section before you ever see it. END_HOLD buys
        that travel back at the end, where the drum sits still on the last
        project until the pin releases.
      */
      const stuckFor = y - trackTop() - lead();
      const spin = spinRange();
      const scrollIdx = spin > 0 ? clamp01(stuckFor / spin) * span : 0;
      target = scrollIdx + offset;

      /*
        The stretch that still turns the drum, bounded at both ends. Outside
        it the reader is on their way out — off the bottom into the END_HOLD
        tail, or back up off the top past the first project — and the
        carousel stops answering the wheel entirely: no swell, no snap, no
        rotation trailing behind the scroll while the section slides away.
      */
      const turning = range > 0 && stuckFor > 0 && stuckFor < spin;

      /*
        Scroll velocity swells the whole drum. Gated on `turning` so it is
        driven by scrolling *this* section, and only while the scrolling still
        means something — without that, racing down the page makes the drum
        arrive already swollen from scrolling elsewhere, and leaving swells it
        on the way out. Attack is quick so it reacts as you pick up speed;
        release is far slower so the swell rides on past the point the wheel
        stops, except on the way out, where it collapses at once.
      */
      const speedGoal = turning
        ? clamp01(dt > 0 ? Math.abs(dy) / dt / SPEED_REF : 0)
        : 0;
      const grip = !turning
        ? SPEED_ATTACK
        : speedGoal > speedAmt
          ? SPEED_ATTACK
          : SPEED_RELEASE;
      if (Math.abs(speedGoal - speedAmt) > 0.0005) {
        speedAmt += (speedGoal - speedAmt) * (1 - Math.pow(grip, dt));
        dirty = true;
      } else if (speedAmt !== speedGoal) {
        speedAmt = speedGoal;
        dirty = true;
      }

      /*
        Settle onto a project once input goes quiet. The remainder is taken
        out of `offset` rather than by scrolling the page: the reader's
        scroll position is theirs, and nudging it fights both the browser
        and any other scroll-driven section on the page. `pos` eases toward
        the corrected target on its own, so this needs no animation of its
        own — the drum just rotates the last fraction into place.
      */
      if (
        turning &&
        !dragging &&
        now - lastInputAt > SNAP_IDLE_MS &&
        Math.abs(target - Math.round(target)) > 0.01
      ) {
        offset += Math.round(target) - target;
        target = Math.round(target);
        dirty = true;
      }

      if (!turning) {
        /*
          On the way out the drum stops *following* the scroll — the target
          is pinned to the project the page reached, first or last, and the
          snap fraction is dropped with it so it sits square rather than a
          sliver off. It still eases into that target like anywhere else:
          cutting the ease as well would land the turn in a single frame,
          which reads as a jump at exactly the moment the section starts to
          slide away.
        */
        if (offset !== 0) offset = 0;
        target = Math.round(scrollIdx);
      }

      const delta = target - pos;
      if (Math.abs(delta) > 0.0002) {
        pos += delta * (1 - Math.pow(0.0005, dt));
        dirty = true;
      } else if (delta !== 0) {
        pos = target;
        dirty = true;
      }

      const hoverGoal = hovered && !dragging ? 1 : 0;

      /* the CTA rides the same signal as the hover scale, so they arrive together */
      if (hoverGoal !== hoverShown) {
        hoverShown = hoverGoal;
        stage.classList.toggle('is-hovering', hoverGoal === 1);
      }

      if (Math.abs(hoverGoal - hoverAmt) > 0.0005) {
        hoverAmt += (hoverGoal - hoverAmt) * (1 - Math.pow(0.004, dt));
        dirty = true;
      } else if (hoverAmt !== hoverGoal) {
        hoverAmt = hoverGoal;
        dirty = true;
      }

      if (!dirty) return;
      dirty = false;

      drum.rotation.y = -pos * step;

      const drumScale = 1 + SPEED_SCALE * speedAmt;
      drum.scale.setScalar(drumScale);

      /*
        Each slide is placed by its own ring distance rather than the strip
        being scrolled as a whole — that is what lets seven cards cover a
        position that never stops climbing. Off-window slides are clipped.
      */
      for (const s of rollSlides) {
        const d = ringDelta(s.i, pos, count);
        /*
          100% is the slide's own width, so a neighbour lands flush against
          the window edge — and a fractional layout width rounds its first
          glyph back inside as a hairline. The extra pixel pushes it clear.
          It scales with distance so it is zero on the centred slide and
          never steps as a slide crosses the middle.
        */
        s.el.style.transform = `translate3d(calc(${d * 100}% + ${d}px), 0, 0)`;
      }

      panels.forEach((panel, i) => {
        const d = Math.abs(ringDelta(i, pos, count));
        const focus = clamp01(1 - d); // 1 on the facing panel, 0 elsewhere
        const dim = 0.34 + 0.66 * focus;
        panel.material.uniforms.uDim.value = dim;
        panel.mirrorMaterial.uniforms.uDim.value = dim;
        panel.mirrorMaterial.uniforms.uOpacity.value = 0.16 + 0.3 * focus;
        /*
          Titles stay up on the off-centre panels — that floating offset is
          most legible on the ones turned away from you. They only fade out
          past the drum's shoulder, where a title on the far side could
          otherwise show through the gaps between panels, back-to-front.
        */
        const onFront = clamp01((TITLE_FADE_AT - d) / 0.6);
        panel.titleMaterial.opacity = (0.42 + 0.55 * focus) * onFront;
        panel.title.visible = panel.titleMaterial.opacity > 0.01;

        /*
          Hover swells the facing panel. Scaling the mesh grows its radius
          too, so it leans towards the camera as it grows. Tied to `focus` so
          it unwinds by itself when the drum turns to another project.
        */
        const s = 1 + HOVER_SCALE * hoverAmt * focus;
        panel.mesh.scale.setScalar(s);
        panel.title.scale.setScalar(s);
        panel.mirror.scale.set(s, -s, s);
        /*
          Keep the gap constant as the (now taller) panel swells, so the
          reflection tracks its bottom edge instead of drifting into it.
        */
        panel.mirror.position.y = PANEL_Y - height * s - MIRROR_GAP;
        /*
          The fade starts at the reflection's own top edge, a gap below the
          panel. It is evaluated in world space, so it has to account for the
          drum's own scale as well as the panel's — otherwise the gradient
          drifts off the reflection whenever the speed scale kicks in.
        */
        panel.mirrorMaterial.uniforms.uFloor.value =
          (PANEL_Y - (height * s) / 2 - MIRROR_GAP) * drumScale;
        panel.mirrorMaterial.uniforms.uSpan.value = height * s * drumScale;
      });

      renderer.render(scene, camera);

      const facing = ((Math.round(pos) % count) + count) % count;
      if (facing !== lastReported) {
        lastReported = facing;
        setActive(facing);
      }
    };
    raf = requestAnimationFrame(tick);
    setReady(true);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      io.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('click', onClick);
      el.removeEventListener('wheel', onWheel);
      stage.removeEventListener('keydown', onKey);
      for (const d of disposables) d.dispose();
      renderer.dispose();
      el.remove();
      goToRef.current = () => {};
    };
  }, [count]);


  return (
    <>
    {/*
      Red rising out of About's ivory. It sits outside the track, not in it:
      the drum maps scroll position across the track's height, so anything
      added inside would start it turning during the arc.
    */}
    <SectionDome tone="red" from="ivory" />

    <div
      ref={trackRef}
      className="p3d-track"
      /* the hero CTA targets #projects; StackCards owns the same id when on */
      id="projects"
      /*
        The pinned scroll distance in projects: one per project to turn, plus
        END_HOLD to sit on the last one before the pin lets go. What a project
        is worth in scroll lives in the stylesheet, so a phone can spend less
        of it — everything here measures the track it is given rather than
        assuming a height.
      */
      style={
        {
          '--p3d-spin': count - 1 + END_HOLD,
          /*
            Set inline rather than left to the class rule: `#projects` also
            carries a height, and as an id selector it wins over any class,
            collapsing the whole track to one viewport. Inline beats both, and
            still reads --p3d-per-project, so the breakpoints keep working.
          */
          height:
            'calc((100 + (var(--p3d-spin) + var(--p3d-start-hold, 0)) * var(--p3d-per-project, 60)) * 1svh)',
        } as CSSProperties
      }
    >
    <section className="p3d-section" aria-labelledby="p3d-heading">
      {/*
        The section's real heading. The oversized word behind the drum reads
        as the title but is aria-hidden and set in a ghost tint, so until now
        the section had no heading at all — only a label on the landmark,
        which does not appear in a document outline or a headings list.

        It reveals through SplitWords like every other heading on the page.
        That reveal is driven by an IntersectionObserver rather than a
        ScrollTrigger, which is what makes it safe here: this section is
        sticky inside a tall track, so a trigger's measured start would be the
        fragile part. IO only ever asks whether the words are on screen.
      */}
      <header className="p3d-head">
        <h2 className="p3d-heading" id="p3d-heading">
          <SplitWords>{COPY.sectionLabel}</SplitWords>
        </h2>
      </header>

      <p className="p3d-word" aria-hidden="true">
        {COPY.headline}
      </p>

      <div
        ref={stageRef}
        className={`p3d-stage${ready ? ' is-ready' : ''}`}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${COPY.sectionLabel}: ${current.title}`}
      >
        <div ref={canvasHostRef} className="p3d-canvas-host" />

        {/*
          The cursor over the facing panel. A click anywhere on that panel
          already opens the project, so the arrow is not a target to aim at —
          it replaces the pointer and says what the whole panel does. Hence
          pointer-events: none: it must never eat the click it is advertising,
          and the canvas underneath has to keep receiving every move.

          Still a real link so the keyboard route survives, since the canvas
          click cannot be tabbed to. Under focus it parks in the middle of the
          stage and stops being a cursor — see globals.css.
        */}
        {href ? (
          <a
            ref={viewRef}
            className="p3d-view"
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={`${COPY.viewLabel} — ${current.title}`}
          >
            <ArrowUpRight size={26} strokeWidth={2.25} aria-hidden="true" />
          </a>
        ) : null}
      </div>

      <div className="p3d-bar">
        {/*
          The pill is a fixed-width window; every changing part rides a track
          that slides by one slot per project, so the card never resizes as
          the copy under it changes length.
        */}
        <div className="p3d-pill" ref={pillRef}>
          <span className="p3d-roll p3d-roll-thumb">
            {ITEMS.map((item, i) => (
              <span key={item.num} className="p3d-roll-slide" data-i={i}>
                <img
                  className="p3d-thumb"
                  src={`/${item.image}`}
                  alt=""
                  aria-hidden={i !== active}
                />
              </span>
            ))}
          </span>

          <span className="p3d-meta">
            <span className="p3d-meta-label">{COPY.categoryLabel}</span>
            <span className="p3d-roll p3d-roll-value">
              {ITEMS.map((item, i) => (
                <span key={item.num} className="p3d-roll-slide" data-i={i}>
                  <span className="p3d-meta-value" aria-hidden={i !== active}>
                    {item.category || COPY.sectionLabel}
                  </span>
                </span>
              ))}
            </span>
          </span>

          <span className="p3d-roll p3d-roll-count">
            {ITEMS.map((item, i) => (
              <span key={item.num} className="p3d-roll-slide" data-i={i}>
                <span className="p3d-count" aria-hidden={i !== active}>
                  {`${String(i + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`}
                </span>
              </span>
            ))}
          </span>
        </div>

        <div className="p3d-nav">
          {/*
            The ends are ends: neither button wraps around, so the first and
            last project are reachable but the ring is not endless.
          */}
          <button
            type="button"
            className="p3d-round"
            onClick={() => go(active - 1)}
            disabled={active === 0}
            aria-label="Previous project"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="p3d-round"
            onClick={() => go(active + 1)}
            disabled={active === count - 1}
            aria-label="Next project"
          >
            <ArrowRight size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      <p className="p3d-title">
        <span className="p3d-title-num">{current.num}</span>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer">
            {current.title}
            <ArrowUpRight size={15} strokeWidth={2.2} aria-hidden="true" />
          </a>
        ) : (
          <span>{current.title}</span>
        )}
      </p>

      {/*
        Moved out of the header and down here: it describes how to work the
        drum, and the drum's other controls — the arrows, the pill — are on
        this edge. Opposite the heading it was a caption with nothing to
        caption.
      */}
      <p className="p3d-hint">{COPY.hint}</p>
    </section>
    </div>
    </>
  );
};

export default ProjectsCarousel3D;
