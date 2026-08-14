export function HeroHeader() {
  return (
    <div className="pt-16 pb-8 text-center sm:pt-20">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#b7e7df] bg-white/75 px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.18em] text-[#0b776e] shadow-sm backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-[#18b7a5] shadow-[0_0_0_4px_rgba(24,183,165,.12)]" />
        OPEN RESEARCH AGENT
      </div>
      <h1 className="mt-4 text-[40px] leading-none font-semibold tracking-[-0.055em] sm:text-[56px]">
        <span className="oq-wordmark">openquantum</span>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#5c6f7c] sm:text-base">
        由 DeepSeek Harness 驱动、通过 Skill 扩展的开放式科研智能体
      </p>
    </div>
  );
}
