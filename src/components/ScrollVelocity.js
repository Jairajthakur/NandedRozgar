/**
 * ScrollVelocity – web-only marquee with scroll-speed reaction.
 * Uses pure DOM APIs + CSS keyframes; no extra deps required.
 *
 * Props:
 *   texts         string[]   – rows of text to display
 *   velocity      number     – base scroll speed (px/s), default 60
 *   className     string     – class applied to each text span
 *   parallaxStyle object     – style for the outer row wrapper
 *   scrollerStyle object     – style for each scrolling text span
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Inject keyframes once
const STYLE_ID = '__sv_style__';
function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes __sv_scroll_ltr {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes __sv_scroll_rtl {
      0%   { transform: translateX(-50%); }
      100% { transform: translateX(0); }
    }
    .__sv_track { display: flex; width: max-content; will-change: transform; }
    .__sv_track--rtl { animation-direction: reverse; }
  `;
  document.head.appendChild(el);
}

function ScrollRow({ text, velocity, reverse, className, scrollerStyle }) {
  const trackRef = useRef(null);
  // base duration so one copy scrolls at the desired velocity
  // We duplicate text so seamless looping works.
  const baseDuration = useRef(null);
  const currentSpeed = useRef(velocity);
  const rafRef = useRef(null);
  const lastScrollY = useRef(
    typeof window !== 'undefined' ? window.scrollY : 0
  );
  const lastScrollTime = useRef(Date.now());
  const impulse = useRef(0);

  // Re-calc base duration whenever velocity prop changes
  useEffect(() => {
    if (!trackRef.current) return;
    // width of one copy = half the total track width
    const trackW = trackRef.current.scrollWidth / 2;
    baseDuration.current = trackW / velocity; // seconds
    trackRef.current.style.animationDuration = `${baseDuration.current}s`;
  });

  // Scroll velocity listener
  useEffect(() => {
    function onScroll() {
      const now = Date.now();
      const dy = Math.abs(window.scrollY - lastScrollY.current);
      const dt = Math.max(now - lastScrollTime.current, 1);
      const v = (dy / dt) * 1000; // px/s
      impulse.current = Math.min(v * 0.004, 3.5); // cap multiplier
      lastScrollY.current = window.scrollY;
      lastScrollTime.current = now;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Smooth decay of impulse → apply to animation play rate via duration scaling
  useEffect(() => {
    function tick() {
      if (!trackRef.current || baseDuration.current === null) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      // Decay impulse
      impulse.current *= 0.92;
      const factor = Math.max(0.25, 1 - impulse.current); // faster = shorter duration
      const newDur = baseDuration.current * factor;
      trackRef.current.style.animationDuration = `${newDur}s`;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const animName = reverse ? '__sv_scroll_rtl' : '__sv_scroll_ltr';

  const trackStyle = {
    animationName: animName,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationPlayState: 'running',
    display: 'flex',
    width: 'max-content',
    willChange: 'transform',
  };

  // Duplicate text for seamless loop
  const content = `${text}   `;

  return (
    <div style={{ overflow: 'hidden', width: '100%', ...scrollerStyle?.container }}>
      <div ref={trackRef} style={trackStyle}>
        {/* Two copies for seamless loop */}
        <span
          className={className}
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            paddingRight: '3rem',
            ...scrollerStyle,
          }}
        >
          {content}
        </span>
        <span
          className={className}
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            paddingRight: '3rem',
            ...scrollerStyle,
          }}
        >
          {content}
        </span>
      </div>
    </div>
  );
}

export default function ScrollVelocity({
  texts = [],
  velocity = 60,
  className = '',
  parallaxStyle = {},
  scrollerStyle = {},
}) {
  useEffect(() => { injectStyles(); }, []);

  if (typeof window === 'undefined') return null;
  if (!texts || texts.length === 0) return null;

  return (
    <div style={parallaxStyle}>
      {texts.map((text, i) => (
        <ScrollRow
          key={i}
          text={text}
          velocity={velocity}
          reverse={i % 2 !== 0}
          className={className}
          scrollerStyle={scrollerStyle}
        />
      ))}
    </div>
  );
}
