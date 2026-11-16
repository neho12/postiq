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
const T = {
  found: 0.05, // "מצאנו..."
  ahs: [3.2, 3.5, 3.8, 4.1], // "אה אה אה אה"
  perfect: 4.36, // "המושלמת לילדי הגן"
  kit: 7.42, // "ערכת הכנת סופגניות"
  donuts: 9.58, // "סופגניות" – arrow to the donut mix
  fun: 10.52, // "גם כיף וגם טעים"
  kids: 13.1, // "בילוי עם הילדים"
  andOnly: 16.22, // "ורק"
  price: 18.12, // "שלושים..."
  end: 22.63,
};
const SHOT_CUTS = [0, 6.37, 13.63, 16.5];

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
        const start = f(T.ahs[h.beat]) + h.dt;
        if (frame < start || frame > allOut) return null;
        const local = frame - start;
        const pop = spring({frame: local, fps, config: {damping: 7, stiffness: 260, mass: 0.6}});
        const out = interpolate(frame, [allOut - 4, allOut], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const wobble = Math.sin(local / 2.5 + i) * 3 * Math.exp(-local / 12);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: h.x,
              top: h.y,
              transform: `translate(-50%, -50%) scale(${pop * (0.6 + 0.4 * out)}) rotate(${h.rot + wobble}deg)`,
              opacity: Math.min(1, pop * 2) * out,
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
  anim?: 'pop' | 'bounce' | 'soft' | 'wiggle';
  tilt?: number;
};

const Title: React.FC<TitleProps> = ({text, from, to, y, variant = 'pink', size = 84, anim = 'pop', tilt = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = f(from);
  const end = f(to);
  if (frame < start || frame > end) return null;
  const local = frame - start;

  const cfg =
    anim === 'bounce' ? {damping: 7, stiffness: 160, mass: 0.8} :
    anim === 'soft' ? {damping: 18, stiffness: 90} :
    {damping: 10, stiffness: 200};
  const s = spring({frame: local, fps, config: cfg});
  const out = interpolate(frame, [end - 7, end], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});

  let scale = s * (0.85 + 0.15 * out);
  let translateY = 0;
  let rotate = tilt;
  if (anim === 'bounce') translateY = (1 - s) * 140;
  if (anim === 'soft') {
    scale = 0.92 + 0.08 * s;
    translateY = (1 - s) * 50;
  }
  if (anim === 'wiggle') rotate = tilt + Math.sin(local / 3.2) * 4 * Math.exp(-local / 18);
  const opacity = (anim === 'soft' ? s : Math.min(1, s * 3)) * out;

  const colors =
{bg: PAL[variant], fg: DEEP, edge: WHITE, shadow: SHADE[variant]};

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y,
        display: 'flex',
        justifyContent: 'center',
        transform: `translateY(-50%) translateY(${translateY}px)`,
        opacity,
      }}
    >
      <div
        style={{
          direction: 'rtl',
          fontFamily,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.15,
          color: colors.fg,
          WebkitTextStroke: `${Math.round(size / 6.5)}px ${colors.bg}`,
          paintOrder: 'stroke fill',
          filter: 'drop-shadow(0 6px 0 rgba(255,255,255,0.95)) drop-shadow(0 12px 18px rgba(78,58,102,0.35))',
          transform: `scale(${scale}) rotate(${rotate}deg)`,
          textAlign: 'center',
          maxWidth: 960,
          whiteSpace: 'nowrap',
          letterSpacing: -0.5,
        }}
      >
        {text}
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
  shape: 'rainbow' | 'smile';
  variant: PalKey;
  size: number;
  stagger?: number; // frames between letters
};

const widthCache: Record<string, number[]> = {};
const measure = (chars: string[], size: number) => {
  const key = chars.join('') + size;
  if (widthCache[key]) return widthCache[key];
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = `900 ${size}px ${fontFamily}`;
  return (widthCache[key] = chars.map((c) => ctx.measureText(c).width + size * 0.02));
};

const ArcTitle: React.FC<ArcProps> = ({text, from, to, x = 540, y, radius, shape, variant, size, stagger = 1.6}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = f(from);
  const end = f(to);
  if (frame < start || frame > end) return null;
  const local = frame - start;
  // visual (left-to-right) order: reverse the Hebrew, but keep number runs as written
  const logical = Array.from(text);
  const chars: string[] = [];
  for (let i = logical.length - 1; i >= 0; ) {
    if (/[0-9]/.test(logical[i])) {
      let j = i;
      while (j > 0 && /[0-9.,]/.test(logical[j - 1])) j--;
      chars.push(...logical.slice(j, i + 1));
      i = j - 1;
    } else {
      chars.push(logical[i]);
      i--;
    }
  }
  const widths = measure(chars, size);
  const total = widths.reduce((a, b) => a + b, 0);

  // the line starts flat and bends into its curve
  const bend = spring({frame: local - 4, fps, config: {damping: 12, stiffness: 90}});
  const R = radius / Math.max(0.02, bend);
  const dir = shape === 'rainbow' ? 1 : -1;
  // whole arc slowly rocks
  const rock = Math.sin(local / 14) * 2.2;
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
    const order = chars.length - 1 - i; // reading order (right to left)
    const ls = start + order * stagger;
    const pop = spring({frame: frame - ls, fps, config: {damping: 8, stiffness: 230, mass: 0.6}});
    const drop = (1 - pop) * -90 * dir;
    const wave = Math.sin((frame - ls) / 5 - order * 0.6) * 5 * Math.min(1, Math.max(0, (frame - ls) / 15));
    const le = exitStart + order * 0.5;
    const out = interpolate(frame, [le, le + 5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return {ch, px, py: py + drop + wave - (1 - out) * 60, rot, scale: pop * out, opacity: Math.min(1, pop * 2.5) * out};
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
          transform: `translate(-50%, -50%) rotate(${l.rot}deg) scale(${l.scale})`,
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
  const start = f(T.price);
  if (frame < start) return null;
  const local = frame - start;
  const pop = spring({frame: local, fps, config: {damping: 6, stiffness: 220, mass: 0.9}});
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
          transform: `scale(${pop * breathe}) rotate(${-8 + (1 - pop) * -25}deg)`,
          
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
      <ArcTitle text="מצאנו תחנת המתנות 🎁" from={T.found} to={3.15} y={250} radius={720} shape="rainbow" variant="pink" size={112} stagger={1.4} />
      <Decorations at={0.25} until={3.1} items={[
        {x: 120, y: 190, kind: 'sparkle', size: 70, delay: 0},
        {x: 960, y: 420, kind: 'star', size: 70, delay: 4, rot: 12},
        {x: 980, y: 170, kind: 'heart', size: 60, delay: 7},
      ]} />

      {/* 3. המתנה המושלמת לילדי הגן */}
      <Title text="המתנה המושלמת לילדי הגן" from={T.perfect} to={7.3} y={1560} variant="sky" size={100} anim="pop" tilt={1.5} />
      <Decorations at={T.perfect + 0.15} until={7.25} items={[
        {x: 95, y: 1450, kind: 'heart', size: 64, delay: 0, color: PAL.lilac},
        {x: 990, y: 1665, kind: 'sparkle', size: 64, delay: 5},
      ]} />

      {/* 4. ערכת הכנת סופגניות */}
      <Title text="ערכת הכנת סופגניות 🍩" from={T.kit} to={10.42} y={1700} variant="peach" size={108} anim="pop" tilt={-1.5} />
      <Arrow from={T.donuts} to={10.42} />

      {/* 5. גם כיף וגם טעים */}
      <ArcTitle text="גם כיף וגם טעים!" from={T.fun} to={13.0} y={150} radius={620} shape="rainbow" variant="mint" size={128} stagger={1.8} />
      <Decorations at={T.fun + 0.2} until={12.95} items={[
        {x: 140, y: 300, kind: 'candy', size: 110, delay: 0, rot: -15},
        {x: 950, y: 290, kind: 'star', size: 62, delay: 6},
      ]} />

      {/* 6. פעילות מתוקה עם הילדים */}
      <Title text="פעילות מתוקה עם הילדים" from={T.kids} to={16.1} y={1690} variant="lavender" size={102} anim="soft" />
      <Decorations at={T.kids + 0.4} until={16.05} items={[
        {x: 85, y: 1545, kind: 'heart', size: 56, delay: 0},
        {x: 1000, y: 1730, kind: 'heart', size: 46, delay: 6, color: PAL.lilac},
      ]} />

      {/* 7. ורק... 38 ₪ */}
      <Title text="ורק..." from={T.andOnly} to={T.price - 0.05} y={880} variant="butter" size={140} anim="pop" tilt={-3} />
      <PriceMoment />
      <ArcTitle text="רק 38 ₪ למארז" from={T.price + 0.35} to={T.end + 1} y={1290} radius={700} shape="smile" variant="butter" size={120} stagger={1.6} />
      <Decorations at={T.price + 0.1} until={T.end + 1} items={[
        {x: 170, y: 560, kind: 'star', size: 95, delay: 0, rot: -12},
        {x: 925, y: 610, kind: 'sparkle', size: 90, delay: 3},
        {x: 905, y: 1170, kind: 'star', size: 75, delay: 6, rot: 18},
        {x: 165, y: 1150, kind: 'heart', size: 70, delay: 9},
        {x: 120, y: 860, kind: 'sparkle', size: 60, delay: 12},
        {x: 960, y: 880, kind: 'candy', size: 100, delay: 14, rot: 20},
      ]} />
    </AbsoluteFill>
  );
};
