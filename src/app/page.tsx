
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Instagram, Twitter } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallPrompt } from "@/components/common/PwaInstallPrompt";
import "./landing.css";

const SPACE_GROTESK = "'Space Grotesk', sans-serif";
const MANROPE = "'Manrope', sans-serif";

export default function LandingPage() {
  const { showInstallPrompt, handleInstallClick, handleDismissClick } = usePwaInstall();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          if (el.hasAttribute("data-grow")) {
            el.style.width = el.getAttribute("data-w") || "0";
          } else {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }
          revealObserver.unobserve(el);
        });
      },
      { threshold: 0.15 }
    );
    container.querySelectorAll("[data-reveal],[data-grow]").forEach((el) => revealObserver.observe(el));

    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const target = parseFloat(el.getAttribute("data-count") || "0");
          const suffix = el.getAttribute("data-suffix") || "";
          const start = performance.now();
          const dur = 1400;
          const tick = (now: number) => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          countObserver.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    container.querySelectorAll("[data-count]").forEach((el) => countObserver.observe(el));

    return () => {
      revealObserver.disconnect();
      countObserver.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {showInstallPrompt && (
        <PwaInstallPrompt onInstall={handleInstallClick} onDismiss={handleDismissClick} />
      )}

      <div
        ref={containerRef}
        className="vy-landing vy-container mx-auto w-full max-w-[440px] md:max-w-[640px] lg:max-w-[1100px] relative overflow-hidden"
        style={{ background: "#08060f", color: "#f4f1fa", boxShadow: "0 0 120px rgba(168,85,247,0.15)" }}
      >
        {/* ============ HERO ============ */}
        <section style={{ position: "relative", minHeight: 620, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 50% 0%, #2a123f 0%, #12071f 55%, #06030c 100%)" }}>
            <div style={{ position: "absolute", width: 320, height: 320, left: -60, top: -40, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.75), transparent 65%)", filter: "blur(30px)", animation: "vy-drift1 9s ease-in-out infinite" }} />
            <div style={{ position: "absolute", width: 300, height: 300, right: -80, top: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.7), transparent 65%)", filter: "blur(34px)", animation: "vy-drift2 11s ease-in-out infinite" }} />
            <div style={{ position: "absolute", width: 260, height: 260, left: 80, bottom: -40, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.5), transparent 65%)", filter: "blur(38px)", animation: "vy-drift3 13s ease-in-out infinite" }} />
            <div style={{ position: "absolute", inset: 0, background: "#ffffff", mixBlendMode: "overlay", animation: "vy-strobe 6s steps(1) infinite" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.4 }} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(8,6,15,0.25) 0%, rgba(8,6,15,0.1) 45%, rgba(8,6,15,0.85) 82%, #08060f 100%)" }} />

          {/* top bar */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 22px" }}>
            <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 22, letterSpacing: "0.5px", background: "linear-gradient(135deg, #ffffff, #d8b4fe)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              VYBI
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(6px)", fontSize: 12, fontWeight: 600, color: "#f4f1fa" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399", animation: "vy-live 1.6s ease-in-out infinite" }} />
              LIVE
            </div>
          </div>

          {/* hero copy */}
          <div style={{ position: "relative", marginTop: "auto", padding: "0 24px 30px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 13px", borderRadius: 999, background: "rgba(168,85,247,0.16)", border: "1px solid rgba(192,132,252,0.35)", fontSize: 12, fontWeight: 600, color: "#e9d5ff", marginBottom: 16 }}>
              🎉 Real-time nightlife, tonight
            </div>
            <h1 className="vy-h1" style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 46, lineHeight: 1.02, letterSpacing: "-1px", margin: "0 0 14px" }}>
              Feel the{" "}
              <span style={{ background: "linear-gradient(115deg, #c084fc, #ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Vybe
              </span>
              <br />
              of the Night
            </h1>
            <p className="vy-hero-subtitle" style={{ fontSize: 16, lineHeight: 1.5, color: "#c9c2da", margin: "0 0 22px", maxWidth: 340 }}>
              Real-time nightclub crowd insights, plus <strong style={{ color: "#f4f1fa", fontWeight: 700 }}>Meet&nbsp;Me</strong> — an opt-in way to meet new people at the venues you&apos;re already at.
            </p>
            <Link
              href="/dashboard"
              style={{ display: "inline-flex", alignItems: "center", gap: 9, width: "100%", justifyContent: "center", padding: "17px 26px", border: "none", borderRadius: 16, fontFamily: MANROPE, fontSize: 16, fontWeight: 700, color: "#fff", cursor: "pointer", background: "linear-gradient(135deg, #a855f7, #ec4899)", animation: "vy-glow 3s ease-in-out infinite" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4l14 8-14 8V4z" fill="#fff" /></svg>
              Get Started — it&apos;s free
            </Link>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, fontSize: 12.5, color: "#8f88a3" }}>
              <span>iOS &amp; Android</span><span style={{ opacity: 0.4 }}>•</span><span>Free to join</span><span style={{ opacity: 0.4 }}>•</span><span>Opt-in privacy</span>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", width: 20, height: 32, border: "2px solid rgba(255,255,255,0.25)", borderRadius: 12, display: "flex", justifyContent: "center", paddingTop: 6 }}>
            <span style={{ width: 3, height: 7, borderRadius: 2, background: "#d8b4fe", animation: "vy-scroll 1.8s ease-in-out infinite" }} />
          </div>
        </section>

        {/* ============ LIVE DASHBOARD ============ */}
        <section style={{ padding: "46px 22px 10px" }}>
          <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "#c084fc", textTransform: "uppercase", marginBottom: 8 }}>The night, in real time</div>
            <h2 className="vy-h2" style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 30, lineHeight: 1.08, letterSpacing: "-0.5px", margin: "0 0 22px" }}>
              See where the energy is — before you leave home.
            </h2>
          </div>

          {/* big live card */}
          <div data-reveal="" style={{ opacity: 0, transform: "translateY(28px)", transition: "all .8s cubic-bezier(.2,.7,.2,1)", position: "relative", borderRadius: 24, padding: 22, background: "linear-gradient(160deg, #1c1330 0%, #0e0a1a 100%)", border: "1px solid rgba(168,85,247,0.22)", overflow: "hidden" }}>
            <div style={{ position: "absolute", width: 180, height: 180, right: -50, top: -60, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.28), transparent 70%)", filter: "blur(10px)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
              <div>
                <div style={{ fontSize: 13, color: "#9a93ad", fontWeight: 600 }}>Downtown • right now</div>
                <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 21, marginTop: 3 }}>Neon Room</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 999, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", fontSize: 12, fontWeight: 700, color: "#6ee7b7" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399", animation: "vy-live 1.4s infinite" }} />
                PACKED
              </div>
            </div>
            <svg viewBox="0 0 320 120" style={{ width: "100%", height: 118, marginTop: 14, overflow: "visible" }}>
              <defs>
                <linearGradient id="vyLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#22d3ee" />
                  <stop offset="0.6" stopColor="#a855f7" />
                  <stop offset="1" stopColor="#ec4899" />
                </linearGradient>
                <linearGradient id="vyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="rgba(168,85,247,0.35)" />
                  <stop offset="1" stopColor="rgba(168,85,247,0)" />
                </linearGradient>
              </defs>
              <path d="M0,90 C40,84 60,60 90,64 C120,68 140,40 175,36 C205,33 225,52 255,40 C285,29 300,20 320,14 L320,120 L0,120 Z" fill="url(#vyFill)" opacity={0.9} />
              <path
                d="M0,90 C40,84 60,60 90,64 C120,68 140,40 175,36 C205,33 225,52 255,40 C285,29 300,20 320,14"
                fill="none"
                stroke="url(#vyLine)"
                strokeWidth={3.5}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 2px 8px rgba(168,85,247,0.6))", strokeDasharray: 520, strokeDashoffset: 520, animation: "vy-dash 2.4s cubic-bezier(.4,.9,.3,1) forwards .3s" }}
              />
              <circle cx={320} cy={14} r={5} fill="#ec4899" style={{ filter: "drop-shadow(0 0 6px #ec4899)", animation: "vy-live 1.4s ease-in-out infinite 2.6s" }} />
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#7c7590", marginTop: 4, fontWeight: 600 }}>
              <span>9 PM</span><span>11 PM</span><span>1 AM</span><span>Now</span>
            </div>
          </div>

          {/* venue meters + capacity ring */}
          <div className="vy-grid-meters" data-reveal="" style={{ opacity: 0, transform: "translateY(28px)", transition: "all .8s cubic-bezier(.2,.7,.2,1) .1s", display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 12 }}>
            <div style={{ borderRadius: 22, padding: 20, background: "linear-gradient(160deg, #161022 0%, #0d0a17 100%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#d8b4fe", marginBottom: 15 }}>Hotspots near you</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 7 }}><span>Neon Room</span><span style={{ color: "#ec4899" }}>92%</span></div>
                  <div style={{ height: 8, borderRadius: 6, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <div data-grow="" data-w="92%" style={{ width: 0, height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#a855f7,#ec4899)", transition: "width 1.3s cubic-bezier(.3,.9,.3,1) .3s" }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 7 }}><span>Skyline Lounge</span><span style={{ color: "#c084fc" }}>67%</span></div>
                  <div style={{ height: 8, borderRadius: 6, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <div data-grow="" data-w="67%" style={{ width: 0, height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#818cf8,#a855f7)", transition: "width 1.3s cubic-bezier(.3,.9,.3,1) .45s" }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 7 }}><span>The Basement</span><span style={{ color: "#22d3ee" }}>38%</span></div>
                  <div style={{ height: 8, borderRadius: 6, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <div data-grow="" data-w="38%" style={{ width: 0, height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#22d3ee,#818cf8)", transition: "width 1.3s cubic-bezier(.3,.9,.3,1) .6s" }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 12 }}>
              <div style={{ borderRadius: 22, padding: 18, background: "linear-gradient(160deg, #161022 0%, #0d0a17 100%)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "relative", width: 104, height: 104 }}>
                  <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                    <circle cx={50} cy={50} r={42} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={9} />
                    <circle cx={50} cy={50} r={42} fill="none" stroke="url(#vyLine)" strokeWidth={9} strokeLinecap="round" strokeDasharray={263.8} style={{ strokeDashoffset: 263.8, animation: "vy-ring 1.8s cubic-bezier(.3,.9,.3,1) forwards .5s" }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span data-count="82" data-suffix="%" style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 26 }}>0%</span>
                    <span style={{ fontSize: 10, color: "#9a93ad", fontWeight: 600 }}>CAPACITY</span>
                  </div>
                </div>
              </div>
              <div style={{ borderRadius: 22, padding: 18, background: "linear-gradient(160deg, #161022 0%, #0d0a17 100%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9a93ad", letterSpacing: 1 }}>ENERGY</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 56, marginTop: 12 }}>
                  <span style={{ flex: 1, background: "linear-gradient(#ec4899,#a855f7)", borderRadius: 3, height: "100%", transformOrigin: "bottom", animation: "vy-eq .7s ease-in-out infinite alternate 0s" }} />
                  <span style={{ flex: 1, background: "linear-gradient(#ec4899,#a855f7)", borderRadius: 3, height: "100%", transformOrigin: "bottom", animation: "vy-eq .55s ease-in-out infinite alternate .15s" }} />
                  <span style={{ flex: 1, background: "linear-gradient(#ec4899,#a855f7)", borderRadius: 3, height: "100%", transformOrigin: "bottom", animation: "vy-eq .8s ease-in-out infinite alternate .3s" }} />
                  <span style={{ flex: 1, background: "linear-gradient(#ec4899,#a855f7)", borderRadius: 3, height: "100%", transformOrigin: "bottom", animation: "vy-eq .5s ease-in-out infinite alternate .1s" }} />
                  <span style={{ flex: 1, background: "linear-gradient(#ec4899,#a855f7)", borderRadius: 3, height: "100%", transformOrigin: "bottom", animation: "vy-eq .68s ease-in-out infinite alternate .22s" }} />
                  <span style={{ flex: 1, background: "linear-gradient(#ec4899,#a855f7)", borderRadius: 3, height: "100%", transformOrigin: "bottom", animation: "vy-eq .6s ease-in-out infinite alternate .05s" }} />
                </div>
                <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 18, marginTop: 10, color: "#f4f1fa" }}>Peaking 🔥</div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section style={{ padding: "46px 22px 10px" }}>
          <h2 data-reveal="" className="vy-h2" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1)", fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 30, letterSpacing: "-0.5px", margin: "0 0 24px", textAlign: "center" }}>
            How <span style={{ color: "#c084fc" }}>Vybi</span> Works
          </h2>
          <div className="vy-grid-steps" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1)", display: "flex", gap: 16, alignItems: "center", padding: 20, borderRadius: 20, background: "linear-gradient(135deg, rgba(129,140,248,0.14), rgba(14,10,23,0.6))", border: "1px solid rgba(129,140,248,0.2)" }}>
              <div style={{ flexShrink: 0, width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg,#4338ca,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", animation: "vy-float 4s ease-in-out infinite" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x={6} y={2.5} width={12} height={19} rx={3} stroke="#fff" strokeWidth={1.8} /><line x1={10} y1={18.5} x2={14} y2={18.5} stroke="#fff" strokeWidth={1.8} strokeLinecap="round" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc" }}>STEP 1</div>
                <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 18, margin: "1px 0 3px" }}>Install the App</div>
                <div style={{ fontSize: 13.5, color: "#a49dba", lineHeight: 1.45 }}>Get Vybi on iOS or Android. Quick, no-hassle setup.</div>
              </div>
            </div>

            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1) .05s", display: "flex", gap: 16, alignItems: "center", padding: 20, borderRadius: 20, background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(14,10,23,0.6))", border: "1px solid rgba(168,85,247,0.22)" }}>
              <div style={{ flexShrink: 0, width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg,#7c3aed,#c084fc)", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, padding: "12px 11px" }}>
                <span style={{ width: 4, background: "#fff", borderRadius: 2, height: "100%", transformOrigin: "bottom", animation: "vy-eq .6s ease-in-out infinite alternate" }} />
                <span style={{ width: 4, background: "#fff", borderRadius: 2, height: "100%", transformOrigin: "bottom", animation: "vy-eq .5s ease-in-out infinite alternate .2s" }} />
                <span style={{ width: 4, background: "#fff", borderRadius: 2, height: "100%", transformOrigin: "bottom", animation: "vy-eq .7s ease-in-out infinite alternate .1s" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#d8b4fe" }}>STEP 2</div>
                <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 18, margin: "1px 0 3px" }}>Check Crowd Levels</div>
                <div style={{ fontSize: 13.5, color: "#a49dba", lineHeight: 1.45 }}>See live data on how busy clubs are, powered by the community.</div>
              </div>
            </div>

            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1) .1s", display: "flex", gap: 16, alignItems: "center", padding: 20, borderRadius: 20, background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(14,10,23,0.6))", border: "1px solid rgba(236,72,153,0.22)" }}>
              <div style={{ flexShrink: 0, position: "relative", width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg,#db2777,#f472b6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: 16, border: "2px solid #f472b6", animation: "vy-ripple 1.8s ease-out infinite" }} />
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" style={{ animation: "vy-beat 1.6s ease-in-out infinite" }}><path d="M12 21s-7.5-4.9-10-9.3C.4 8.6 2 5 5.5 5c2 0 3.5 1.2 4.5 2.6C11 6.2 12.5 5 14.5 5 18 5 19.6 8.6 22 11.7 19.5 16.1 12 21 12 21z" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f9a8d4" }}>STEP 3</div>
                <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 18, margin: "1px 0 3px" }}>Tap Meet Me</div>
                <div style={{ fontSize: 13.5, color: "#a49dba", lineHeight: 1.45 }}>Opt in when you arrive to meet others there — friendship, or something more.</div>
              </div>
            </div>

            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1) .15s", display: "flex", gap: 16, alignItems: "center", padding: 20, borderRadius: 20, background: "linear-gradient(135deg, rgba(34,211,238,0.13), rgba(14,10,23,0.6))", border: "1px solid rgba(34,211,238,0.2)" }}>
              <div style={{ flexShrink: 0, position: "relative", width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg,#0891b2,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l2.4 6.9L21.5 9l-5.6 4.4 2 7.1L12 16.9 6.1 20.5l2-7.1L2.5 9l7.1-.1z" /></svg>
                <span style={{ position: "absolute", top: 8, right: 10, width: 6, height: 6, background: "#fff", borderRadius: "50%", animation: "vy-spark 1.6s ease-out infinite" }} />
                <span style={{ position: "absolute", bottom: 12, left: 9, width: 5, height: 5, background: "#a5f3fc", borderRadius: "50%", animation: "vy-spark 1.9s ease-out infinite .5s" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#67e8f9" }}>STEP 4</div>
                <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 18, margin: "1px 0 3px" }}>Go Where It&apos;s Lit</div>
                <div style={{ fontSize: 13.5, color: "#a49dba", lineHeight: 1.45 }}>Head straight to the hottest spots and skip the guesswork.</div>
              </div>
            </div>
          </div>

          <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1)", marginTop: 16, display: "flex", gap: 12, padding: "16px 18px", borderRadius: 18, background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.22)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5l7-3z" stroke="#34d399" strokeWidth={1.7} strokeLinejoin="round" /><path d="M8.5 12l2.3 2.3L15.5 9.5" stroke="#34d399" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div style={{ fontSize: 13, color: "#b8e6d3", lineHeight: 1.5 }}>
              Crowd insights are aggregate only — never tied to individuals. <strong style={{ color: "#6ee7b7" }}>Meet Me is entirely opt-in</strong>: your profile is only ever visible to others who&apos;ve also opted in at the same venue, and you can go invisible any time.
            </div>
          </div>
        </section>

        {/* ============ WHY YOU'LL LOVE VYBI ============ */}
        <section style={{ padding: "46px 22px 10px" }}>
          <h2 data-reveal="" className="vy-h2" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1)", fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 30, letterSpacing: "-0.5px", margin: "0 0 24px", textAlign: "center" }}>
            Why You&apos;ll Love <span style={{ color: "#ec4899" }}>Vybi</span>
          </h2>
          <div className="vy-grid-love" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1)", borderRadius: 20, padding: 20, background: "linear-gradient(155deg, #1a1330 0%, #0d0a18 100%)", border: "1px solid rgba(168,85,247,0.18)" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(168,85,247,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 13 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx={12} cy={12} r={9} stroke="#c084fc" strokeWidth={1.8} /><path d="M8.5 12l2.3 2.3L15.5 9" stroke="#c084fc" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 16, marginBottom: 5 }}>Avoid Empty Clubs</div>
              <div style={{ fontSize: 12.5, color: "#a49dba", lineHeight: 1.45 }}>Never waste a night on a dead scene. Find the energy you&apos;re after.</div>
            </div>

            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1) .05s", borderRadius: 20, padding: 20, background: "linear-gradient(155deg, #1a1330 0%, #0d0a18 100%)", border: "1px solid rgba(236,72,153,0.18)" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(236,72,153,0.16)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 13 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 21c4-4 6.5-7.2 6.5-10.5A6.5 6.5 0 0012 4a6.5 6.5 0 00-6.5 6.5C5.5 13.8 8 17 12 21z" stroke="#f472b6" strokeWidth={1.8} strokeLinejoin="round" /><circle cx={12} cy={10.3} r={2.3} stroke="#f472b6" strokeWidth={1.8} /></svg>
              </div>
              <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 16, marginBottom: 5 }}>Discover Hotspots</div>
              <div style={{ fontSize: 12.5, color: "#a49dba", lineHeight: 1.45 }}>Uncover trending clubs and hidden gems packed with partygoers.</div>
            </div>

            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1) .1s", borderRadius: 20, padding: 20, background: "linear-gradient(155deg, #1a1330 0%, #0d0a18 100%)", border: "1px solid rgba(129,140,248,0.18)" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(129,140,248,0.16)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 13 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx={9} cy={8} r={3} stroke="#a5b4fc" strokeWidth={1.8} /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="#a5b4fc" strokeWidth={1.8} strokeLinecap="round" /><path d="M16 6.2a3 3 0 010 5.6M18 19c0-2.4-1-4.2-2.6-5.2" stroke="#a5b4fc" strokeWidth={1.8} strokeLinecap="round" /></svg>
              </div>
              <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 16, marginBottom: 5 }}>Meet New People</div>
              <div style={{ fontSize: 12.5, color: "#a49dba", lineHeight: 1.45 }}>Opt in with one tap to meet others at the same venue.</div>
            </div>

            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1) .15s", borderRadius: 20, padding: 20, background: "linear-gradient(155deg, #1a1330 0%, #0d0a18 100%)", border: "1px solid rgba(34,211,238,0.18)" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(34,211,238,0.14)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 13 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 13a8 8 0 11-9-9 6.5 6.5 0 009 9z" stroke="#67e8f9" strokeWidth={1.8} strokeLinejoin="round" /></svg>
              </div>
              <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 16, marginBottom: 5 }}>Maximize Your Night</div>
              <div style={{ fontSize: 12.5, color: "#a49dba", lineHeight: 1.45 }}>Less time searching, more time enjoying the best nightlife your city offers.</div>
            </div>
          </div>
        </section>

        {/* ============ WHY CLUBS SHOULD JOIN ============ */}
        <section style={{ padding: "46px 22px 10px" }}>
          <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1)", textAlign: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "#67e8f9", textTransform: "uppercase", marginBottom: 8 }}>For venues</div>
            <h2 className="vy-h2" style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 30, lineHeight: 1.08, letterSpacing: "-0.5px", margin: "0 0 24px" }}>
              Why your club should be{" "}
              <span style={{ background: "linear-gradient(115deg, #c084fc, #ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                listed on Vybi
              </span>
            </h2>
          </div>
          <div className="vy-grid-club" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1)", display: "flex", gap: 15, alignItems: "flex-start", padding: 19, borderRadius: 20, background: "linear-gradient(155deg, #1a1330 0%, #0d0a18 100%)", border: "1px solid rgba(168,85,247,0.2)" }}>
              <div style={{ flexShrink: 0, position: "relative", width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#c084fc)", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, padding: "13px 12px" }}>
                <span style={{ width: 5, background: "#fff", borderRadius: 2, height: "100%", transformOrigin: "bottom", animation: "vy-eq .6s ease-in-out infinite alternate" }} />
                <span style={{ width: 5, background: "#fff", borderRadius: 2, height: "100%", transformOrigin: "bottom", animation: "vy-eq .5s ease-in-out infinite alternate .18s" }} />
                <span style={{ width: 5, background: "#fff", borderRadius: 2, height: "100%", transformOrigin: "bottom", animation: "vy-eq .72s ease-in-out infinite alternate .09s" }} />
              </div>
              <div>
                <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 16.5, marginBottom: 4 }}>Live Crowd Insights</div>
                <div style={{ fontSize: 13, color: "#a49dba", lineHeight: 1.5 }}>See your venue&apos;s real-time occupancy so you always know how busy you are, right from the dashboard.</div>
              </div>
            </div>

            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1) .05s", display: "flex", gap: 15, alignItems: "flex-start", padding: 19, borderRadius: 20, background: "linear-gradient(155deg, #1a1330 0%, #0d0a18 100%)", border: "1px solid rgba(236,72,153,0.2)" }}>
              <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#db2777,#f472b6)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 16l5-5 3.5 3.5L20 7.5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 34, strokeDashoffset: 34, animation: "vy-dash 1.6s ease-in-out infinite alternate" }} /><path d="M15 7.5h5v5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 16.5, marginBottom: 4 }}>Data-Driven Analytics</div>
                <div style={{ fontSize: 13, color: "#a49dba", lineHeight: 1.5 }}>Hourly visitor trends, busiest days, average time spent, and new-vs-returning patron patterns — the numbers you need to plan staffing, events, and promotions.</div>
              </div>
            </div>

            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1) .1s", display: "flex", gap: 15, alignItems: "flex-start", padding: 19, borderRadius: 20, background: "linear-gradient(155deg, #1a1330 0%, #0d0a18 100%)", border: "1px solid rgba(129,140,248,0.2)" }}>
              <div style={{ flexShrink: 0, position: "relative", width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#4338ca,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: 14, border: "2px solid #818cf8", animation: "vy-ripple 2s ease-out infinite" }} />
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx={9} cy={8} r={3} stroke="#fff" strokeWidth={1.8} /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" /><path d="M16 6.2a3 3 0 010 5.6M18 19c0-2.4-1-4.2-2.6-5.2" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" /></svg>
              </div>
              <div>
                <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 16.5, marginBottom: 4 }}>Reach More Partygoers</div>
                <div style={{ fontSize: 13, color: "#a49dba", lineHeight: 1.5 }}>Get discovered by people nearby who are actively deciding where to go tonight — completely free visibility, no ad spend required.</div>
              </div>
            </div>

            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1)", display: "flex", gap: 15, alignItems: "flex-start", padding: 19, borderRadius: 20, background: "linear-gradient(155deg, #1a1330 0%, #0d0a18 100%)", border: "1px solid rgba(236,72,153,0.2)" }}>
              <div style={{ flexShrink: 0, position: "relative", width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#db2777,#f472b6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" style={{ animation: "vy-beat 1.6s ease-in-out infinite" }}><path d="M12 21s-7.5-4.9-10-9.3C.4 8.6 2 5 5.5 5c2 0 3.5 1.2 4.5 2.6C11 6.2 12.5 5 14.5 5 18 5 19.6 8.6 22 11.7 19.5 16.1 12 21 12 21z" /></svg>
              </div>
              <div>
                <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 16.5, marginBottom: 4 }}>Meet Me Drives Foot Traffic</div>
                <div style={{ fontSize: 13, color: "#a49dba", lineHeight: 1.5 }}>Our opt-in Meet Me feature turns your venue into the place people go to meet someone new, encouraging longer visits and repeat trips.</div>
              </div>
            </div>

            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1) .05s", display: "flex", gap: 15, alignItems: "flex-start", padding: 19, borderRadius: 20, background: "linear-gradient(155deg, #1a1330 0%, #0d0a18 100%)", border: "1px solid rgba(52,211,153,0.2)" }}>
              <div style={{ flexShrink: 0, position: "relative", width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#059669,#34d399)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: 14, border: "2px solid #34d399", animation: "vy-ripple 2.2s ease-out infinite .3s" }} />
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5l7-3z" stroke="#fff" strokeWidth={1.7} strokeLinejoin="round" /><path d="M8.5 12l2.3 2.3L15.5 9.5" stroke="#fff" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 16.5, marginBottom: 4 }}>Build Trust With Safety Ratings</div>
                <div style={{ fontSize: 13, color: "#a49dba", lineHeight: 1.5 }}>Patron-driven safety ratings help new visitors feel confident choosing your venue over the competition.</div>
              </div>
            </div>

            <div data-reveal="" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s cubic-bezier(.2,.7,.2,1) .1s", display: "flex", gap: 15, alignItems: "flex-start", padding: 19, borderRadius: 20, background: "linear-gradient(155deg, #1a1330 0%, #0d0a18 100%)", border: "1px solid rgba(34,211,238,0.2)" }}>
              <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#0891b2,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx={12} cy={12} r={9} stroke="#fff" strokeWidth={1.8} /><path d="M8 12l2.6 2.6L16.5 9" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 16, strokeDashoffset: 16, animation: "vy-dash 1.4s ease-out infinite alternate" }} /></svg>
              </div>
              <div>
                <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 16.5, marginBottom: 4 }}>Free to List, No Hidden Fees</div>
                <div style={{ fontSize: 13, color: "#a49dba", lineHeight: 1.5 }}>Get set up on Vybi at zero cost — just visibility and insight from day one.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ CLUB OWNER CTA ============ */}
        <section style={{ padding: "42px 22px 46px" }}>
          <div data-reveal="" style={{ opacity: 0, transform: "translateY(28px)", transition: "all .8s cubic-bezier(.2,.7,.2,1)", position: "relative", borderRadius: 26, padding: "34px 26px", overflow: "hidden", background: "linear-gradient(140deg, #7c3aed 0%, #a855f7 45%, #ec4899 100%)" }}>
            <div style={{ position: "absolute", width: 200, height: 200, right: -60, top: -60, borderRadius: "50%", background: "rgba(255,255,255,0.16)", filter: "blur(20px)", animation: "vy-drift1 10s ease-in-out infinite" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "5px 5px", opacity: 0.5 }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.8)" }}>FOR VENUES</div>
              <h2 style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 27, lineHeight: 1.1, margin: "8px 0 10px", color: "#fff" }}>Are You a Club Owner?</h2>
              <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "rgba(255,255,255,0.92)", margin: "0 0 22px" }}>
                List your venue on Vybi and attract more partygoers. It&apos;s free to get on the map and boost your visibility.
              </p>
              <a
                href="mailto:hello@vybi.co.za?subject=List%20My%20Club%20on%20Vybi"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 26px", border: "none", borderRadius: 14, background: "#0d0a17", color: "#fff", fontFamily: MANROPE, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
              >
                List Your Club
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            </div>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer style={{ padding: "34px 22px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
          <div style={{ fontFamily: SPACE_GROTESK, fontWeight: 700, fontSize: 24, letterSpacing: "0.5px", background: "linear-gradient(135deg, #ffffff, #d8b4fe)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>
            VYBI
          </div>
          <p style={{ fontSize: 13, color: "#7c7590", margin: "0 0 18px" }}>Feel the vybe. Find your people.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 22, fontSize: 13, fontWeight: 600, marginBottom: 22 }}>
            <Link href="/terms#data">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="mailto:hello@vybi.co.za">Contact</a>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 20 }}>
            <a href="#" aria-label="Instagram" style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Instagram size={18} color="#c084fc" />
            </a>
            <a href="#" aria-label="Twitter" style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Twitter size={18} color="#c084fc" />
            </a>
          </div>
          <p style={{ fontSize: 11, color: "#57516a", margin: 0 }}>© {new Date().getFullYear()} Vybi. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
