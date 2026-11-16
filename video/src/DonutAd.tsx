import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
import {continueRender, delayRender} from 'remotion';

const FONT = 'AdumaFOT';
const fontFamily = `${FONT}, 'Noto Color Emoji', sans-serif`;
if (typeof document !== 'undefined' && !(window as any).__fontLoading) {
  (window as any).__fontLoading = true;
  const handle = delayRender('Loading Aduma FOT');
  const faces = [
    new FontFace(FONT, `url(${staticFile('AdumaFOT-Bold.otf')})`, {weight: '700'}),
    new FontFace(FONT, `url(${staticFile('AdumaFOT-Heavy.otf')})`, {weight: '800 900'}),
  ];
  Promise.all(faces.map((ff) => ff.load())).then((loaded) => {
    loaded.forEach((ff) => document.fonts.add(ff));
    continueRender(handle);
  });
}

// Brand palette
// Soft pastel rainbow palette
const PAL = {
  pink: '#F6B8C8',
  peach: '#F8C6A0',
  butter: '#F9E6A5',
  mint: '#B9DEC5',
  sky: '#AFCFE8',
  lilac: '#B9B8E5',
  lavender: '#D4B8E8',
};
// slightly deeper tone of each colour, used for the 3D bottom edge
const SHADE: Record<keyof typeof PAL, string> = {
  pink: '#E390A8',
  peach: '#E6A06F',
  butter: '#E2C66C',
  mint: '#86C09C',
  sky: '#7FAED6',
  lilac: '#8D8BD0',
  lavender: '#B48DD3',
};
type PalKey = keyof typeof PAL;
const DEEP = '#4E3A66'; // text colour – deep plum for contrast on pastels
const PINK = PAL.pink;
const RED = PAL.lavender;
const CREAM = '#FFF8F0';
const WHITE = '#FFFFFF';

const FPS = 30;
const f = (sec: number) => Math.round(sec * FPS);

// Timings measured from the song (Whisper word timestamps + audio onsets)
// Word onsets measured on the isolated vocal track (Demucs + onset detection, cross-checked with Whisper)
const W = {
  matzanu: 0.13, lachem: 0.86, et: 1.16, hamatana: 1.71, mat: 2.16,
  ah: [3.16, 3.46, 3.74, 4.03],
  hamushlemet: 4.31, leyaldei: 5.42, hagan: 6.0,
  erkat: 8.21, hachanat: 8.85, sufganiyot: 9.44, sufTail: 9.85,
  gam: 11.21, kef: 11.41, vegam: 11.67, taim: 12.02,
  biluy: 13.11, im: 13.72, hayeladim: 14.26,
  verak: 17.4, rak: 17.68,
  shloshim: 18.13, ushmone: 19.17, shkalim: 19.98, shkalimEnd: 20.37,
};
const T = {
  found: W.matzanu,
  ahs: W.ah,
  perfect: W.hamushlemet,
  kit: W.erkat,
  donuts: W.sufganiyot,
  fun: W.gam,
  kids: W.biluy,
  andOnly: W.verak,
  price: W.shloshim, // the moment the price lands
  end: 22.63,
};
const SHOT_CUTS = [0, 6.37, 13.63, 16.5];

/* ---------------- keyframe helper: hand-timed motion, no generic springs ---------------- */
const OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const OUT_BACK = Easing.bezier(0.34, 1.4, 0.64, 1);
const kf = (t: number, times: number[], values: number[], ease: (x: number) => number = Easing.out(Easing.cubic)) =>
  interpolate(t, times, values, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
// small deterministic per-letter timing offset so letters don't land like a metronome
const jitter = (i: number) => (((i * 37 + 11) % 7) / 7 - 0.5) * 1.2;

/* ---------------- Video layer: drift zoom + beat punches ---------------- */
const punch = (frame: number, at: number, amp: number, len = 7) => {
  const d = frame - f(at);
  if (d < 0 || d > len) return 0;
  return amp * Math.pow(1 - d / len, 2);
};

const VideoLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  // gentle drift inside each shot
  let shotStart = 0;
  let shotEnd = T.end;
  for (let i = 0; i < SHOT_CUTS.length; i++) {
    if (t >= SHOT_CUTS[i]) {
      shotStart = SHOT_CUTS[i];
      shotEnd = SHOT_CUTS[i + 1] ?? T.end;
    }
  }
  const p = (t - shotStart) / (shotEnd - shotStart);
  const drift = 1.02 + 0.035 * Easing.inOut(Easing.sin)(Math.min(1, Math.max(0, p)));

  const beats =
    punch(frame, T.found, 0.03, 10) +
    punch(frame, T.perfect, 0.025, 9) +
    punch(frame, T.kit, 0.025, 9) +
    punch(frame, T.fun, 0.02, 8) +
    punch(frame, T.kids, 0.02, 8) +
    punch(frame, T.price, 0.07, 12);

  const shiftX = 0;

  return (
    <AbsoluteFill style={{transform: `translateX(${shiftX}px) scale(${drift + beats})`}}>
      <OffthreadVideo src={staticFile('src.mp4')} muted style={{width: '100%', height: '100%'}} />
    </AbsoluteFill>
  );
};

const Flashes: React.FC = () => {
  const frame = useCurrentFrame();
  const o = punch(frame, T.price, 0.35, 7);
  return <AbsoluteFill style={{background: WHITE, opacity: Math.min(0.4, o)}} />;
};

/* ---------------- "ha ha" word burst on the four "ah" beats ---------------- */
type Ha = {beat: number; dt: number; x: number; y: number; text: string; size: number; rot: number; color: string; fill: string};
const HA_WORDS: Ha[] = [
  // beat 1
  {beat: 0, dt: 0, x: 230, y: 330, text: 'HA', size: 170, rot: -12, color: DEEP, fill: PAL.pink},
  {beat: 0, dt: 2, x: 790, y: 1390, text: 'ha ha', size: 110, rot: 8, color: DEEP, fill: PAL.peach},
  {beat: 0, dt: 4, x: 910, y: 160, text: 'ha!', size: 96, rot: 14, color: DEEP, fill: PAL.butter},
  // beat 2
  {beat: 1, dt: 0, x: 790, y: 400, text: 'HA HA', size: 136, rot: 10, color: DEEP, fill: PAL.mint},
  {beat: 1, dt: 2, x: 210, y: 1720, text: 'ha', size: 124, rot: -10, color: DEEP, fill: PAL.sky},
  {beat: 1, dt: 4, x: 150, y: 130, text: 'ha!', size: 90, rot: -16, color: DEEP, fill: PAL.lilac},
  // beat 3
  {beat: 2, dt: 0, x: 260, y: 1300, text: 'HA!', size: 156, rot: -8, color: DEEP, fill: PAL.lavender},
  {beat: 2, dt: 2, x: 870, y: 1740, text: 'haha', size: 104, rot: 12, color: DEEP, fill: PAL.pink},
  {beat: 2, dt: 4, x: 530, y: 140, text: 'ha', size: 100, rot: 4, color: DEEP, fill: PAL.mint},
  // beat 4 – biggest
  {beat: 3, dt: 0, x: 540, y: 1545, text: 'HA HA HA!', size: 160, rot: -5, color: DEEP, fill: PAL.peach},
  {beat: 3, dt: 2, x: 500, y: 340, text: 'HA', size: 136, rot: 12, color: DEEP, fill: PAL.sky},
  {beat: 3, dt: 3, x: 940, y: 1180, text: 'ha!', size: 92, rot: -12, color: DEEP, fill: PAL.butter},
];

const HaBurst: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const allOut = f(T.perfect) - 1; // everything clears before "המושלמת"
  return (
    <>
      {HA_WORDS.map((h, i) => {
        const start = f(T.ahs[h.beat]) - 2 + h.dt;
        if (frame < start || frame > allOut) return null;
        const local = frame - start;
        // rubber-stamp: lands big and fast, tiny rebound, then holds still; cuts out on the downbeat
        const sc = kf(local, [0, 2, 4, 7], [1.6, 0.92, 1.03, 1]);
        const op = kf(local, [0, 1.5], [0, 1]);
        const flick = kf(local, [0, 3, 7], [i % 2 ? 9 : -9, i % 2 ? -2 : 2, 0]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: h.x,
              top: h.y,
              transform: `translate(-50%, -50%) scale(${sc}) rotate(${h.rot + flick}deg)`,
              opacity: op,
              fontFamily,
              fontWeight: 900,
              fontSize: h.size,
              lineHeight: 1,
              color: h.color,
              whiteSpace: 'nowrap',
              direction: 'ltr',
              letterSpacing: 2,
              WebkitTextStroke: `${Math.round(h.size / 7)}px ${h.fill}`,
              paintOrder: 'stroke fill',
              filter: 'drop-shadow(0 6px 0 rgba(255,255,255,0.95)) drop-shadow(0 12px 16px rgba(78,58,102,0.35))',
            }}
          >
            {h.text}
          </div>
        );
      })}
    </>
  );
};

/* ---------------- Decorations ---------------- */
const Star: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M50 2 L61 38 L98 38 L68 60 L79 96 L50 74 L21 96 L32 60 L2 38 L39 38Z" fill={color} stroke={WHITE} strokeWidth={6} strokeLinejoin="round" />
  </svg>
);
const Heart: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M50 88 C20 66 4 50 4 30 C4 14 16 4 30 4 C40 4 47 10 50 18 C53 10 60 4 70 4 C84 4 96 14 96 30 C96 50 80 66 50 88Z" fill={color} stroke={WHITE} strokeWidth={6} />
  </svg>
);
const Candy: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 120 60">
    <path d="M4 10 L30 30 L4 50Z" fill={PAL.peach} stroke={WHITE} strokeWidth={4} strokeLinejoin="round" />
    <path d="M116 10 L90 30 L116 50Z" fill={PAL.peach} stroke={WHITE} strokeWidth={4} strokeLinejoin="round" />
    <circle cx="60" cy="30" r="26" fill={PAL.mint} stroke={WHITE} strokeWidth={5} />
    <path d="M44 22 Q60 34 76 22" stroke={WHITE} strokeWidth={5} fill="none" strokeLinecap="round" />
  </svg>
);
const Sparkle: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M50 0 Q56 44 100 50 Q56 56 50 100 Q44 56 0 50 Q44 44 50 0Z" fill={WHITE} />
  </svg>
);

type Deco = {x: number; y: number; kind: 'star' | 'heart' | 'candy' | 'sparkle'; size: number; delay: number; color?: string; rot?: number};

const Decorations: React.FC<{at: number; until: number; items: Deco[]}> = ({at, until, items}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <>
      {items.map((d, i) => {
        const start = f(at) + d.delay;
        const s = spring({frame: frame - start, fps, config: {damping: 9, stiffness: 180}});
        const out = interpolate(frame, [f(until) - 8, f(until)], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const floatY = Math.sin((frame - start) / 9 + i) * 6;
        if (frame < start || frame > f(until)) return null;
        const rot = (d.rot ?? 0) + (d.kind === 'sparkle' ? (frame - start) * 3 : Math.sin((frame - start) / 12) * 8);
        const node =
          d.kind === 'star' ? <Star size={d.size} color={d.color ?? PAL.butter} /> :
          d.kind === 'heart' ? <Heart size={d.size} color={d.color ?? PINK} /> :
          d.kind === 'candy' ? <Candy size={d.size} /> : <Sparkle size={d.size} />;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: d.x - d.size / 2,
              top: d.y - d.size / 2 + floatY,
              transform: `scale(${s * out}) rotate(${rot}deg)`,
              filter: 'drop-shadow(0 6px 10px rgba(78,58,102,0.30))',
            }}
          >
            {node}
          </div>
        );
      })}
    </>
  );
};

/* ---------------- Animated title pill ---------------- */
type TitleProps = {
  text: string;
  from: number;
  to: number;
  y: number; // center y in px
  variant?: PalKey;
  size?: number;
  anim?: 'mask' | 'stretch' | 'rise' | 'type';
  tilt?: number;
  wordTimes?: number[]; // seconds at which each word should be readable
};

const Title: React.FC<TitleProps> = ({text, from, to, y, variant = 'pink', size = 84, anim = 'mask', tilt = 0, wordTimes}) => {
  const frame = useCurrentFrame();
  const start = f(from);
  const end = f(to);
  if (frame < start || frame > end) return null;
  const t = frame - start;
  const tOut = frame - (end - 7);

  const textStyle: React.CSSProperties = {
    fontFamily,
    fontWeight: 800,
    fontSize: size,
    lineHeight: 1.15,
    color: DEEP,
    WebkitTextStroke: `${Math.round(size / 6.5)}px ${PAL[variant]}`,
    paintOrder: 'stroke fill',
    whiteSpace: 'pre',
  };
  const words = text.split(' ');
  // frame (relative to start) at which word i begins its entrance; lead = frames needed to become readable
  const wStart = (i: number, step: number, lead: number) => (wordTimes ? f(wordTimes[i]) - start - lead : i * step);

  let content: React.ReactNode;
  let wrap = '';
  if (anim === 'mask') {
    // words rise up from behind an invisible baseline, one after another, and exit the same way
    content = words.map((w, i) => {
      const t0 = wStart(i, 3, 3);
      const yIn = kf(t, [t0, t0 + 13], [115, 0], OUT_EXPO);
      const yOut = kf(tOut, [i * 1.2, i * 1.2 + 7], [0, -115], Easing.in(Easing.cubic));
      return (
        <span key={i} style={{display: 'inline-block', overflow: 'hidden', padding: '0.18em 0.06em', margin: '-0.18em 0'}}>
          <span style={{...textStyle, display: 'inline-block', transform: `translateY(${yIn + yOut}%)`}}>{w}{i < words.length - 1 ? ' ' : ''}</span>
        </span>
      );
    });
  } else if (anim === 'stretch') {
    // each word squeezes in from a thin sliver, overshoots wide and settles – exactly on its word
    content = words.map((w, i) => {
      const t0 = wStart(i, 4, 4);
      const L = t - t0;
      const sx = L < 13 ? kf(L, [0, 5, 9, 13], [0.15, 1.1, 0.97, 1]) : kf(tOut, [0, 6], [1, 0.05], Easing.in(Easing.cubic));
      const sy = L < 13 ? kf(L, [0, 5, 9, 13], [1.5, 0.9, 1.03, 1]) : kf(tOut, [0, 6], [1, 1.35], Easing.in(Easing.cubic));
      const op = kf(L, [0, 3], [0, 1]) * kf(tOut, [3, 6], [1, 0]);
      return (
        <span key={i} style={{...textStyle, display: 'inline-block', opacity: op, transform: `scale(${sx}, ${sy})`}}>
          {w}{i < words.length - 1 ? ' ' : ''}
        </span>
      );
    });
  } else if (anim === 'rise') {
    // soft word-by-word focus pull: each word drifts up out of a blur
    content = words.map((w, i) => {
      const t0 = wStart(i, 4, 4);
      const op = kf(t, [t0, t0 + 8], [0, 1]) * kf(tOut, [0, 6], [1, 0]);
      const ty = kf(t, [t0, t0 + 14], [38, 0], OUT_EXPO) + kf(tOut, [0, 7], [0, 24], Easing.in(Easing.quad));
      const blur = kf(t, [t0, t0 + 10], [14, 0]) + kf(tOut, [0, 6], [0, 10]);
      return (
        <span key={i} style={{...textStyle, display: 'inline-block', opacity: op, transform: `translateY(${ty}px)`, filter: `blur(${blur}px)`}}>
          {w}{i < words.length - 1 ? ' ' : ''}
        </span>
      );
    });
  } else {
    // 'type': letters are typed on, no easing at all – hard cut out
    const chars = Array.from(text);
    const per = wordTimes ? Math.max(1, (f(wordTimes[1]) - start) / (chars.length - 1)) : 2.2;
    const shown = Math.min(chars.length, Math.floor(t / per) + 1);
    content = <span style={textStyle}>{chars.slice(0, shown).join('')}</span>;
  }

  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', transform: 'translateY(-50%)'}}>
      <div
        style={{
          direction: 'rtl',
          display: 'flex',
          filter: 'drop-shadow(0 6px 0 rgba(255,255,255,0.95)) drop-shadow(0 12px 18px rgba(78,58,102,0.35))',
          transform: `rotate(${tilt}deg) ${wrap}`,
        }}
      >
        {content}
      </div>
    </div>
  );
};

/* ---------------- Curved (arc) title with per-letter animation ---------------- */
type ArcProps = {
  text: string;
  from: number;
  to: number;
  x?: number;
  y: number; // y of the arc's middle point
  radius: number;
  shape: 'rainbow' | 'smile' | 'flat';
  variant: PalKey;
  size: number;
  stagger?: number; // frames between letters
  wordTimes?: number[]; // seconds at which each word (logical order) should LAND
};

const widthCache: Record<string, number[]> = {};
const measure = (chars: string[], size: number) => {
  const key = chars.join('') + size;
  if (widthCache[key]) return widthCache[key];
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = `900 ${size}px ${fontFamily}`;
  return (widthCache[key] = chars.map((c) => ctx.measureText(c).width + size * 0.02));
};

const ArcTitle: React.FC<ArcProps> = ({text, from, to, x = 540, y, radius, shape, variant, size, stagger = 1.6, wordTimes}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = f(from);
  const end = f(to);
  if (frame < start || frame > end) return null;
  const local = frame - start;
  // visual (left-to-right) order: reverse the Hebrew, but keep number runs as written
  const logical = Array.from(text);
  const idx: number[] = []; // logical index of each visual slot
  for (let i = logical.length - 1; i >= 0; ) {
    if (/[0-9]/.test(logical[i])) {
      let j = i;
      while (j > 0 && /[0-9.,]/.test(logical[j - 1])) j--;
      for (let k = j; k <= i; k++) idx.push(k);
      i = j - 1;
    } else {
      idx.push(i);
      i--;
    }
  }
  const chars = idx.map((k) => logical[k]);
  // word number and position-in-word for every logical character
  const wordOf: number[] = [];
  const posInWord: number[] = [];
  {
    let wN = 0;
    let pos = 0;
    logical.forEach((c) => {
      if (c === ' ') {
        wordOf.push(wN);
        posInWord.push(pos);
        wN++;
        pos = 0;
      } else {
        wordOf.push(wN);
        posInWord.push(pos++);
      }
    });
  }
  const widths = measure(chars, size);
  const total = widths.reduce((a, b) => a + b, 0);

  // the line starts flat and bends into its curve
  const bend = kf(local, [5, 5 + chars.length * stagger * 0.8 + 6], [0.6, 1], Easing.bezier(0.45, 0, 0.2, 1));
  const R = shape === 'flat' ? 1e7 : radius / Math.max(0.02, bend);
  const dir = shape === 'smile' ? -1 : 1;
  // whole arc slowly rocks
  const rock = 0;
  const exitStart = end - 9;

  let cum = 0;
  const letters = chars.map((ch, i) => {
    const w = widths[i];
    const s = cum + w / 2 - total / 2;
    cum += w;
    const theta = s / R;
    const px = x + R * Math.sin(theta);
    const py = y + dir * R * (1 - Math.cos(theta));
    const rot = (dir * theta * 180) / Math.PI;
    const order = idx[i]; // reading order (logical index)
    const LAND = 5; // frames from release to touching the baseline
    const ls = wordTimes
      ? f(wordTimes[wordOf[order]]) - LAND + posInWord[order] * 1.1 + jitter(order) * 0.5
      : start + order * stagger + jitter(order);
    const L = frame - ls;
    // fall with gravity (ease-in), stretched while falling, squash on landing, settle
    const fall = kf(L, [0, 5], [-150, 0], Easing.in(Easing.quad));
    const sX = kf(L, [0, 4.5, 6, 9, 13], [0.82, 0.86, 1.2, 0.95, 1]);
    const sY = kf(L, [0, 4.5, 6, 9, 13], [1.28, 1.22, 0.78, 1.05, 1]);
    const tiltIn = kf(L, [0, 5, 10], [((order % 3) - 1) * 14, ((order % 3) - 1) * -4, 0]);
    const le = exitStart + order * 0.45;
    const E = frame - le;
    const exitY = kf(E, [0, 5], [1, 0], Easing.in(Easing.cubic)); // squish down into the baseline
    const vis = L >= 0 ? 1 : 0;
    return {ch, px, py: py + fall * dir, rot: rot + tiltIn, sx: sX, sy: sY * exitY, opacity: vis * kf(L, [0, 1.5], [0, 1]) * (E > 4.5 ? 0 : 1)};
  });

  const base: React.CSSProperties = {
    position: 'absolute',
    fontFamily,
    fontWeight: 900,
    fontSize: size,
    lineHeight: 1,
    whiteSpace: 'pre',
  };
  const layer = (stroke: boolean) =>
    letters.map((l, i) => (
      <div
        key={(stroke ? 's' : 'f') + i}
        style={{
          ...base,
          left: l.px,
          top: l.py,
          opacity: l.opacity,
          transform: `translate(-50%, -50%) rotate(${l.rot}deg) scale(${l.sx}, ${l.sy})`,
          transformOrigin: '50% 80%',
          color: stroke ? PAL[variant] : DEEP,
          WebkitTextStroke: stroke ? `${Math.round(size / 6.5)}px ${PAL[variant]}` : undefined,
        }}
      >
        {l.ch}
      </div>
    ));

  return (
    <AbsoluteFill
      style={{
        transform: `rotate(${rock}deg)`,
        transformOrigin: `${x}px ${y}px`,
        filter: 'drop-shadow(0 6px 0 rgba(255,255,255,0.95)) drop-shadow(0 12px 18px rgba(78,58,102,0.35))',
      }}
    >
      {layer(true)}
      {layer(false)}
    </AbsoluteFill>
  );
};

/* ---------------- Arrow to the donut mix ---------------- */
const Arrow: React.FC<{from: number; to: number}> = ({from, to}) => {
  const frame = useCurrentFrame();
  if (frame < f(from) || frame > f(to)) return null;
  const draw = interpolate(frame, [f(from), f(from) + 9], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const head = interpolate(frame, [f(from) + 7, f(from) + 11], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out = interpolate(frame, [f(to) - 6, f(to)], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const L = 420;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: out}}>
      <g style={{filter: 'drop-shadow(0 4px 6px rgba(78,58,102,0.4))'}}>
        <path d="M600 1560 C 640 1420, 760 1360, 805 1245" fill="none" stroke={WHITE} strokeWidth={16} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - draw)} />
        <path d="M600 1560 C 640 1420, 760 1360, 805 1245" fill="none" stroke={PAL.lilac} strokeWidth={8} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - draw)} />
        <g transform={`translate(805 1245) rotate(-20) scale(${head})`}>
          <path d="M-34 30 L0 -8 L34 30" fill="none" stroke={WHITE} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M-34 30 L0 -8 L34 30" fill="none" stroke={PAL.lilac} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  );
};

/* ---------------- Price moment ---------------- */
const Burst: React.FC<{size: number}> = ({size}) => {
  const pts: string[] = [];
  const n = 18;
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? 50 : 42;
    const a = (Math.PI * i) / n - Math.PI / 2;
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="1">
          {Object.values(PAL).map((c, i, a) => (
            <stop key={c} offset={i / (a.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <polygon points={pts.join(' ')} fill="url(#rainbow)" stroke={WHITE} strokeWidth={2.2} strokeLinejoin="round" />
      <circle cx="50" cy="50" r="36.5" fill="none" stroke={WHITE} strokeWidth={1.4} strokeDasharray="2 2.2" />
    </svg>
  );
};

const PriceMoment: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = f(T.price) - 5; // 5-frame slam lands exactly on the word
  if (frame < start) return null;
  const local = frame - start;
  // slams in from the camera, squashes on impact, settles; then holds still
  const slam = kf(local, [0, 5], [2.4, 1], Easing.in(Easing.quad));
  const pSX = kf(local, [5, 7, 11, 15], [1, 1.14, 0.97, 1]);
  const pSY = kf(local, [5, 7, 11, 15], [1, 0.84, 1.03, 1]);
  const pOp = kf(local, [0, 3], [0, 1]);
  const sub = spring({frame: local - 10, fps, config: {damping: 11, stiffness: 170}});
  const glow = interpolate(local, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const breathe = 1 + Math.sin(local / 7) * 0.02 * Math.min(1, local / 20);
  const size = 640;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 540 - size / 2,
          top: 880 - size / 2,
          width: size,
          height: size,
          transform: `rotate(-6deg) scale(${slam * pSX}, ${slam * pSY})`,
          transformOrigin: '50% 62%',
          opacity: pOp,
          
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily,
            fontWeight: 900,
            color: DEEP,
            direction: 'ltr',
            WebkitTextStroke: `44px ${PAL.pink}`,
            paintOrder: 'stroke fill',
            filter: 'drop-shadow(0 10px 0 rgba(255,255,255,0.95)) drop-shadow(0 18px 26px rgba(78,58,102,0.4))',
          }}
        >
          <span style={{fontSize: 400, lineHeight: 1, letterSpacing: -6}}>38</span>
          <span style={{fontSize: 200, lineHeight: 1, marginLeft: 10, marginTop: 40}}>₪</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Composition ---------------- */
export const DonutAd: React.FC = () => {
  return (
    <AbsoluteFill style={{background: CREAM}}>
      <VideoLayer />
      <Flashes />
      <HaBurst />

      {/* 1. מצאנו תחנת המתנות */}
      <ArcTitle text="מצאנו תחנת המתנות 🎁" from={0} to={3.12} wordTimes={[W.matzanu, W.lachem, W.hamatana, W.mat]} y={250} radius={720} shape="rainbow" variant="pink" size={112} stagger={1.4} />
      <Decorations at={0.25} until={3.1} items={[
        {x: 120, y: 190, kind: 'sparkle', size: 70, delay: 0},
        {x: 1000, y: 560, kind: 'star', size: 64, delay: 4, rot: 12},
        {x: 980, y: 170, kind: 'heart', size: 60, delay: 7},
      ]} />

      {/* 3. המתנה המושלמת לילדי הגן */}
      <Title text="המתנה המושלמת לילדי הגן" from={T.perfect - 0.25} to={8.05} wordTimes={[W.hamushlemet - 0.12, W.hamushlemet, W.leyaldei, W.hagan]} y={1560} variant="sky" size={100} anim="mask" tilt={1.5} />
      <Decorations at={T.perfect + 0.15} until={8.0} items={[
        {x: 95, y: 1450, kind: 'heart', size: 64, delay: 0, color: PAL.lilac},
        {x: 990, y: 1665, kind: 'sparkle', size: 64, delay: 5},
      ]} />

      {/* 4. ערכת הכנת סופגניות */}
      <Title text="ערכת הכנת סופגניות 🍩" from={T.kit - 0.2} to={10.75} wordTimes={[W.erkat, W.hachanat, W.sufganiyot, W.sufTail]} y={1700} variant="peach" size={108} anim="stretch" tilt={-1.5} />

      {/* 5. גם כיף וגם טעים */}
      <ArcTitle text="גם כיף וגם טעים!" from={T.fun - 0.2} to={13.02} wordTimes={[W.gam, W.kef, W.vegam, W.taim]} y={150} radius={680} shape="rainbow" variant="mint" size={116} stagger={1.8} />
      <Decorations at={T.fun + 0.2} until={12.95} items={[
        {x: 120, y: 440, kind: 'candy', size: 100, delay: 0, rot: -15},
        {x: 990, y: 440, kind: 'star', size: 58, delay: 6},
      ]} />

      {/* 6. פעילות מתוקה עם הילדים */}
      <Title text="פעילות מתוקה עם הילדים" from={T.kids - 0.2} to={17.2} wordTimes={[W.biluy, (W.biluy + W.im) / 2, W.im, W.hayeladim]} y={1690} variant="lavender" size={102} anim="rise" />
      <Decorations at={T.kids + 0.4} until={17.15} items={[
        {x: 85, y: 1545, kind: 'heart', size: 56, delay: 0},
        {x: 1000, y: 1730, kind: 'heart', size: 46, delay: 6, color: PAL.lilac},
      ]} />

      {/* 7. ורק... 38 ₪ */}
      <Title text="ורק..." from={T.andOnly} to={T.price - 0.17} wordTimes={[W.verak, W.rak + 0.25]} y={880} variant="butter" size={140} anim="type" tilt={-3} />
      <PriceMoment />
      <ArcTitle text="רק 38 ₪ למארז" from={T.price} to={T.end + 1} wordTimes={[18.6, W.ushmone, W.shkalim, W.shkalimEnd]} y={1290} radius={700} shape="smile" variant="butter" size={120} stagger={1.6} />
      <Decorations at={T.price + 0.1} until={T.end + 1} items={[
        {x: 170, y: 560, kind: 'star', size: 95, delay: 0, rot: -12},
        {x: 925, y: 610, kind: 'sparkle', size: 90, delay: 3},
        {x: 1000, y: 1360, kind: 'star', size: 66, delay: 6, rot: 18},
        {x: 165, y: 1150, kind: 'heart', size: 70, delay: 9},
        {x: 120, y: 860, kind: 'sparkle', size: 60, delay: 12},
        {x: 930, y: 1460, kind: 'candy', size: 100, delay: 14, rot: 20},
      ]} />
    </AbsoluteFill>
  );
};
