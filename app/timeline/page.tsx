"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowDown } from "lucide-react";
import Header from "@/components/Header";
import TimelineChart, { TimelineChartHandle } from "@/components/TimelineChart";
import ExploreChart from "@/components/ExploreChart";
import { STEPS, SERIES, OVERALL, DATES } from "@/data/timeline";

// Chart progress (0-1) each step should align to, from its date.
const STEP_TARGETS = STEPS.map((s) => {
  const i = DATES.indexOf(s.at);
  const idx = i >= 0 ? i : 0;
  return idx / (DATES.length - 1);
});

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function TimelinePage() {
  const storyRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<TimelineChartHandle>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const exploreRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useGSAP(() => {
    if (!storyRef.current) return;
    const st = ScrollTrigger.create({
      trigger: storyRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        // Map scroll → step position, then to the chart progress of that step's
        // date (interpolating between steps). Lets events sit at any dates.
        const t = self.progress * (STEPS.length - 1);
        const k = Math.min(STEPS.length - 2, Math.floor(t));
        const f = t - k;
        const prog =
          STEP_TARGETS[k] + (STEP_TARGETS[k + 1] - STEP_TARGETS[k]) * f;
        chartRef.current?.setProgress(prog);
        const idx = Math.round(t);
        if (idx !== activeRef.current) {
          activeRef.current = idx;
          setActive(idx);
        }
      },
    });

    // Fade the story out as the explore CTA scrolls into view.
    const fade = gsap.fromTo(
      storyRef.current,
      { opacity: 1 },
      {
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: ctaRef.current,
          start: "top 90%",
          end: "top 40%",
          scrub: true,
        },
      },
    );

    return () => {
      st.kill();
      fade.scrollTrigger?.kill();
      fade.kill();
    };
  });

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200">
      <Header />

      {/* Intro (placeholder) */}
      <section className="max-w-3xl mx-auto px-6 min-h-[80vh] flex flex-col justify-center text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500 mb-4">
          A year of tariffs
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
          How effective tariff rates diverged in 2026
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Placeholder intro. This is where the scene-setting copy goes before
          the story begins — a couple of sentences explaining what an
          &ldquo;effective tariff rate&rdquo; is, who these ten countries are,
          and why their paths split apart over the year. Scroll to begin.
        </p>
        <div className="mt-12 flex justify-center text-slate-600 animate-bounce">
          <ArrowDown size={20} />
        </div>
      </section>

      {/* Story: left steps scroll, right chart sticks */}
      <div
        ref={storyRef}
        className="relative max-w-6xl mx-auto px-6 flex flex-col md:flex-row"
      >
        {/* Steps */}
        <div className="md:w-[42%] md:pr-10 order-2 md:order-1">
          {STEPS.map((s, i) => (
            <section
              key={i}
              className="min-h-screen flex flex-col justify-center"
            >
              <div
                className={`transition-opacity duration-300 ${active === i ? "opacity-100" : "opacity-35"}`}
              >
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                  {s.date}
                </p>
                <h2 className="text-2xl font-semibold text-white mb-3">
                  {s.title}
                </h2>
                <div className="text-base text-slate-400 leading-relaxed">
                  {s.body}
                </div>
                {s.quote && (
                  <blockquote className="mt-8 flex gap-6 text-slate-200">
                    <div
                      aria-hidden="true"
                      className="block shrink-0 text-[96px] font-black leading-none text-white"
                    >
                      "
                    </div>
                    <div className="text-x1 md:text-2x1 italic leading-relaxed text-slate-200">
                      {s.quote}
                    </div>
                  </blockquote>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Sticky chart */}
        <div className="md:w-[58%] order-1 md:order-2">
          <div className="sticky top-[72px] h-[calc(100vh-72px)] flex items-center">
            <div className="w-full">
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-white font-medium">
                  <span
                    className="w-4 h-0 border-t-2 border-dashed"
                    style={{ borderColor: OVERALL.color }}
                  />
                  {OVERALL.name}
                </span>
                {SERIES.map((s) => (
                  <span key={s.code} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </span>
                ))}
              </div>
              <TimelineChart ref={chartRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Explore CTA */}
      <section
        ref={ctaRef}
        className="max-w-3xl mx-auto px-6 py-24 text-center"
      >
        <h2 className="text-2xl font-semibold text-white mb-3">
          Explore the chart yourself
        </h2>
        <p className="text-slate-400 mb-8">
          Toggle countries, scrub through time, and click any line to inspect
          it.
        </p>
        <button
          onClick={() =>
            exploreRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          className="inline-flex items-center gap-2 bg-white text-[#0a0f1e] font-semibold text-sm px-6 py-3 rounded-full hover:bg-slate-100 transition-colors"
        >
          Explore the chart
          <ArrowDown size={14} />
        </button>
      </section>

      {/* Interactive explore */}
      <section
        ref={exploreRef}
        className="max-w-6xl mx-auto px-6 pb-32 pt-6 scroll-mt-[72px]"
      >
        <ExploreChart />
      </section>
    </div>
  );
}
