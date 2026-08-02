'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import data from '../data.json';

type Project = {
  num: string;
  title: string;
  description: string;
  link?: string;
  links?: { label: string; href: string }[];
  image: string;
  bg: string;
  accent: string;
  short?: string;
  category?: string;
};

const ITEMS: Project[] = data.stackCards.items as Project[];
const COPY = data.projects3d;

/* ── scene constants ───────────────────────────────────────────── */
const RADIUS = 3.2;
const HEIGHT = 1.55;
const PANEL_Y = 0.5;
const LIFT = 0.26; // camera sits below the drum centre, so reflections get room
const FILL = 0.8; // slice of each angular step covered by an image
const FOV = 45;
const DRAG_PX_PER_ITEM = 300;
const SCROLL_PER_ITEM = 60; // % of viewport height of pinned scroll per project
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
    const font = (size: number) =>
      `900 ${size}px "Libre Franklin", system-ui, sans-serif`;

    // canvas text scales linearly with font size, so one measurement fits it
    const fit = (rows: string[]) => {
      ctx.font = font(100);
      const widest = Math.max(...rows.map((r) => ctx.measureText(r).width));
      return Math.min(height * TITLE_MAX, (100 * maxWidth) / widest);
    };

    let lines = [label];
    let size = fit(lines);

    // a title too long to stay legible on one line breaks at its midpoint
    if (size < height * TITLE_WRAP_AT) {
      lines = splitBalanced(label);
      size = fit(lines);
    }

    ctx.font = font(size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // a soft drop shadow sells the gap between the text and the image
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.4;
    ctx.shadowOffsetY = size * 0.08;
    ctx.fillStyle = 'rgba(245, 241, 232, 0.96)';

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
    const panelAspect = (RADIUS * arc) / HEIGHT;
    const floor = PANEL_Y - HEIGHT / 2;

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

    const blank = new THREE.DataTexture(
      new Uint8Array([10, 10, 10, 255]),
      1,
      1
    );
    blank.needsUpdate = true;

    const geometry = new THREE.CylinderGeometry(
      RADIUS,
      RADIUS,
      HEIGHT,
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
    const titleAspect = (titleRadius * textArc) / HEIGHT;
    const textGeometry = new THREE.CylinderGeometry(
      titleRadius,
      titleRadius,
      HEIGHT,
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
          uFallback: { value: new THREE.Color('#141414') },
          uHasMap: { value: 0 },
          uOpacity: { value: reflect ? 0.4 : 1 },
          uDim: { value: 1 },
          uReflect: { value: reflect ? 1 : 0 },
          uFloor: { value: floor },
          uSpan: { value: HEIGHT },
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
        HEIGHT lands the copy exactly under the floor line, and MIRROR_GAP
        pushes it further down so the two read as separate objects rather
        than one seam. The shader fades it out with distance.
      */
      const mirror = new THREE.Mesh(geometry, mirrorMaterial);
      mirror.position.y = PANEL_Y - HEIGHT - MIRROR_GAP;
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
    const resize = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!w || !h) return;

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
      const byHeight = RADIUS + HEIGHT / (2 * heightFraction * tanHalfFov);

      /*
        The view stays level (no tilt); dropping the camera below the drum's
        centre just pushes the drum up the frame and reveals its reflection.
      */
      const eyeY = PANEL_Y - LIFT * HEIGHT;
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
      Two inputs sum into one position:

        pos = scrollIdx (0→span, from the page) + offset (unbounded)

      Scroll stays finite so running off the end of the section releases the
      pin and carries on to whatever follows. Everything else — buttons,
      keys, drag, horizontal wheel — moves `offset` instead, which has no
      bounds at all. The drum is a ring, so it happily spins through it
      forever, and the page is never scrolled programmatically.
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
      Step to the nearest copy of `index` on the ring, measured from where we
      are already heading so rapid clicks accumulate instead of cancelling.
    */
    goToRef.current = (index) => {
      offset += ringDelta(index, Math.round(target), count);
      dirty = true;
    };

    /* ── pointer drag ───────────────────────────────────────────── */
    let dragging = false;
    let pointerId = -1;
    let startX = 0;
    let startOffset = 0;
    let moved = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0; // items per second
    let hovered = false; // pointer is over the facing panel
    let hoverAmt = 0; // eased 0→1 driving the hover scale

    const el = renderer.domElement;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startOffset = offset;
      moved = 0;
      velocity = 0;
      lastT = performance.now();
      el.setPointerCapture(pointerId);
      stage.classList.add('is-dragging');
    };

    const onMove = (e: PointerEvent) => {
      // hover runs on every move, drag or not, so it must precede the guard
      hovered = !dragging && pickIndex(e) === facingIndex();

      if (!dragging || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      // drag spins the ring, never the page, so it can keep going forever
      offset = startOffset - dx / DRAG_PX_PER_ITEM;

      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) {
        velocity = -(e.clientX - lastX) / DRAG_PX_PER_ITEM / (dt / 1000);
        lastT = now;
        lastX = e.clientX;
      }
      lastInputAt = now;
      dirty = true;
    };

    const endDrag = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      stage.classList.remove('is-dragging');
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
      if (moved < 6) return; // a tap — onClick deals with it

      // carry the flick, then let the idle snap settle on an item
      offset += THREE.MathUtils.clamp(velocity * 0.22, -1.2, 1.2);
      lastInputAt = performance.now();
      dirty = true;
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
      offset += e.deltaX / 260;
      lastInputAt = performance.now();
      dirty = true;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') offset += 1;
      else if (e.key === 'ArrowLeft') offset -= 1;
      else return;
      dirty = true;
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
      const stuckFor = y - trackTop();
      const scrollIdx = range > 0 ? clamp01(stuckFor / range) * span : 0;
      target = scrollIdx + offset;

      // true only while the section is the one actually pinned to the viewport
      const inSection = range > 0 && stuckFor > -1 && stuckFor < range + 1;

      /*
        Scroll velocity swells the whole drum. Gated on `inSection` so it is
        driven by scrolling *this* section — without that, racing down the
        page makes the drum arrive already swollen from scrolling elsewhere.
        Attack is quick so it reacts as you pick up speed; release is far
        slower so the swell rides on past the point the wheel stops.
      */
      const speedGoal = inSection
        ? clamp01(dt > 0 ? Math.abs(dy) / dt / SPEED_REF : 0)
        : 0;
      const grip = speedGoal > speedAmt ? SPEED_ATTACK : SPEED_RELEASE;
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
        inSection &&
        !dragging &&
        now - lastInputAt > SNAP_IDLE_MS &&
        Math.abs(target - Math.round(target)) > 0.01
      ) {
        offset += Math.round(target) - target;
        target = Math.round(target);
        dirty = true;
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
        panel.mirror.position.y = PANEL_Y - HEIGHT * s - MIRROR_GAP;
        /*
          The fade starts at the reflection's own top edge, a gap below the
          panel. It is evaluated in world space, so it has to account for the
          drum's own scale as well as the panel's — otherwise the gradient
          drifts off the reflection whenever the speed scale kicks in.
        */
        panel.mirrorMaterial.uniforms.uFloor.value =
          (PANEL_Y - (HEIGHT * s) / 2 - MIRROR_GAP) * drumScale;
        panel.mirrorMaterial.uniforms.uSpan.value = HEIGHT * s * drumScale;
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
    <div
      ref={trackRef}
      className="p3d-track"
      /* the hero CTA targets #projects; StackCards owns the same id when on */
      id="projects"
      /* one viewport for the section itself, plus the pinned scroll distance */
      style={{ height: `${100 + (count - 1) * SCROLL_PER_ITEM}svh` }}
    >
    <section className="p3d-section" aria-label={COPY.sectionLabel}>
      <header className="p3d-head">
        <span className="p3d-eyebrow">{COPY.sectionLabel}</span>
        <span className="p3d-hint">{COPY.hint}</span>
      </header>

      <h2 className="p3d-word" aria-hidden="true">
        {COPY.headline}
      </h2>

      <div
        ref={stageRef}
        className={`p3d-stage${ready ? ' is-ready' : ''}`}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${COPY.sectionLabel}: ${current.title}`}
      >
        <div ref={canvasHostRef} className="p3d-canvas-host" />
      </div>

      {href ? (
        <a
          className="p3d-view"
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${COPY.viewLabel} — ${current.title}`}
        >
          {COPY.viewLabel}
        </a>
      ) : null}

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

          <span className="p3d-roll p3d-roll-count text-center">
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
          <button
            type="button"
            className="p3d-round"
            onClick={() => go((active - 1 + count) % count)}
            aria-label="Previous project"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="p3d-round"
            onClick={() => go((active + 1) % count)}
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
    </section>
    </div>
  );
};

export default ProjectsCarousel3D;
