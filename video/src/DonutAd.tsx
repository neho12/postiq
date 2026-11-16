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

const fontFamily = 'RubikLocal';
if (typeof document !== 'undefined' && !(window as any).__rubikLoading) {
  (window as any).__rubikLoading = true;
  const handle = delayRender('Loading Rubik');
  const face = new FontFace(fontFamily, `url(${staticFile('Rubik.ttf')})`, {weight: '300 900'});
  face.load().then((ff) => {
    document.fonts.add(ff);
    continueRender(handle);
  });
}

// Brand palette
const PINK = '#FF6B9A';
const RED = '#E3263F';
const CREAM = '#FFF5E9';
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
    T.ahs.reduce((s, a, i) => s + punch(frame, a, i % 2 === 0 ? 0.06 : 0.045), 0) +
    punch(frame, T.found, 0.03, 10) +
    punch(frame, T.perfect, 0.025, 9) +
    punch(frame, T.kit, 0.025, 9) +
    punch(frame, T.fun, 0.02, 8) +
    punch(frame, T.kids, 0.02, 8) +
    punch(frame, T.price, 0.07, 12);

  // alternate tiny offsets on the "ah" beats for a rhythmic feel
  const shiftX = T.ahs.reduce((s, a, i) => s + punch(frame, a, i % 2 === 0 ? 14 : -14), 0);

  return (
    <AbsoluteFill style={{transform: `translateX(${shiftX}px) scale(${drift + beats})`}}>
      <OffthreadVideo src={staticFile('src.mp4')} muted style={{width: '100%', height: '100%'}} />
    </AbsoluteFill>
  );
};

const Flashes: React.FC = () => {
  const frame = useCurrentFrame();
  const o = T.ahs.reduce((s, a) => s + punch(frame, a, 0.22, 5), 0) + punch(frame, T.price, 0.35, 7);
  return <AbsoluteFill style={{background: WHITE, opacity: Math.min(0.4, o)}} />;
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
    <path d="M4 10 L30 30 L4 50Z" fill={PINK} stroke={WHITE} strokeWidth={4} strokeLinejoin="round" />
    <path d="M116 10 L90 30 L116 50Z" fill={PINK} stroke={WHITE} strokeWidth={4} strokeLinejoin="round" />
    <circle cx="60" cy="30" r="26" fill={RED} stroke={WHITE} strokeWidth={5} />
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
          d.kind === 'star' ? <Star size={d.size} color={d.color ?? '#FFC93C'} /> :
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
              filter: 'drop-shadow(0 6px 10px rgba(180,20,60,0.35))',
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
  variant?: 'cream' | 'pink' | 'red';
  size?: number;
  anim?: 'pop' | 'bounce' | 'soft' | 'wiggle';
  tilt?: number;
};

const Title: React.FC<TitleProps> = ({text, from, to, y, variant = 'cream', size = 84, anim = 'pop', tilt = 0}) => {
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
    variant === 'pink' ? {bg: PINK, fg: WHITE, edge: WHITE, shadow: RED} :
    variant === 'red' ? {bg: RED, fg: WHITE, edge: CREAM, shadow: '#8E1026'} :
    {bg: CREAM, fg: RED, edge: WHITE, shadow: PINK};

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
          background: colors.bg,
          padding: '22px 46px 26px',
          borderRadius: 999,
          border: `7px solid ${colors.edge}`,
          boxShadow: `0 10px 0 ${colors.shadow}, 0 18px 40px rgba(120,10,40,0.30)`,
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
      <g style={{filter: 'drop-shadow(0 4px 6px rgba(140,10,40,0.45))'}}>
        <path d="M600 1560 C 640 1420, 760 1360, 805 1245" fill="none" stroke={WHITE} strokeWidth={16} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - draw)} />
        <path d="M600 1560 C 640 1420, 760 1360, 805 1245" fill="none" stroke={PINK} strokeWidth={8} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - draw)} />
        <g transform={`translate(805 1245) rotate(-20) scale(${head})`}>
          <path d="M-34 30 L0 -8 L34 30" fill="none" stroke={WHITE} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M-34 30 L0 -8 L34 30" fill="none" stroke={PINK} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
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
      <polygon points={pts.join(' ')} fill={RED} stroke={WHITE} strokeWidth={2.2} strokeLinejoin="round" />
      <circle cx="50" cy="50" r="36.5" fill="none" stroke={CREAM} strokeWidth={1.2} strokeDasharray="2 2.2" />
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
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 46%, rgba(255,245,233,${0.55 * glow}) 0%, rgba(255,245,233,0) 48%)`}} />
      <div
        style={{
          position: 'absolute',
          left: 540 - size / 2,
          top: 880 - size / 2,
          width: size,
          height: size,
          transform: `scale(${pop * breathe}) rotate(${-8 + (1 - pop) * -25}deg)`,
          filter: 'drop-shadow(0 22px 30px rgba(120,10,40,0.45))',
        }}
      >
        <div style={{position: 'absolute', inset: 0, transform: `rotate(${local * 0.6}deg)`}}>
          <Burst size={size} />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily,
            fontWeight: 900,
            color: WHITE,
            direction: 'ltr',
            textShadow: '0 8px 0 #8E1026',
          }}
        >
          <span style={{fontSize: 300, lineHeight: 1, letterSpacing: -10}}>39</span>
          <span style={{fontSize: 150, lineHeight: 1, marginLeft: 10, marginTop: 40}}>₪</span>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 1290,
          display: 'flex',
          justifyContent: 'center',
          opacity: Math.min(1, sub * 2),
          transform: `translateY(${(1 - sub) * 60}px) scale(${0.8 + 0.2 * sub})`,
        }}
      >
        <div
          style={{
            direction: 'rtl',
            fontFamily,
            fontWeight: 800,
            fontSize: 86,
            color: RED,
            background: CREAM,
            padding: '20px 54px 24px',
            borderRadius: 999,
            border: `7px solid ${WHITE}`,
            boxShadow: `0 10px 0 ${PINK}, 0 18px 40px rgba(120,10,40,0.3)`,
            whiteSpace: 'nowrap',
          }}
        >
          רק 39 ₪ למארז
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

      {/* 1. מצאנו תחנת המתנות */}
      <Title text="מצאנו תחנת המתנות 🎁" from={T.found} to={3.15} y={300} variant="pink" size={78} anim="bounce" tilt={-2} />
      <Decorations at={0.25} until={3.1} items={[
        {x: 120, y: 190, kind: 'sparkle', size: 70, delay: 0},
        {x: 960, y: 420, kind: 'star', size: 70, delay: 4, rot: 12},
        {x: 980, y: 170, kind: 'heart', size: 60, delay: 7},
      ]} />

      {/* 3. המתנה המושלמת לילדי הגן */}
      <Title text="המתנה המושלמת לילדי הגן" from={T.perfect} to={7.3} y={1560} variant="cream" size={70} anim="pop" tilt={1.5} />
      <Decorations at={T.perfect + 0.15} until={7.25} items={[
        {x: 95, y: 1450, kind: 'heart', size: 64, delay: 0, color: RED},
        {x: 990, y: 1665, kind: 'sparkle', size: 64, delay: 5},
      ]} />

      {/* 4. ערכת הכנת סופגניות */}
      <Title text="ערכת הכנת סופגניות 🍩" from={T.kit} to={10.42} y={1700} variant="red" size={76} anim="pop" tilt={-1.5} />
      <Arrow from={T.donuts} to={10.42} />

      {/* 5. גם כיף וגם טעים */}
      <Title text="גם כיף וגם טעים!" from={T.fun} to={13.0} y={170} variant="pink" size={92} anim="wiggle" tilt={-2} />
      <Decorations at={T.fun + 0.2} until={12.95} items={[
        {x: 140, y: 300, kind: 'candy', size: 110, delay: 0, rot: -15},
        {x: 950, y: 290, kind: 'star', size: 62, delay: 6},
      ]} />

      {/* 6. פעילות מתוקה עם הילדים */}
      <Title text="פעילות מתוקה עם הילדים" from={T.kids} to={16.1} y={1690} variant="cream" size={72} anim="soft" />
      <Decorations at={T.kids + 0.4} until={16.05} items={[
        {x: 85, y: 1545, kind: 'heart', size: 56, delay: 0},
        {x: 1000, y: 1730, kind: 'heart', size: 46, delay: 6, color: RED},
      ]} />

      {/* 7. ורק... 39 ₪ */}
      <Title text="ורק..." from={T.andOnly} to={T.price - 0.05} y={880} variant="pink" size={110} anim="pop" tilt={-3} />
      <PriceMoment />
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
