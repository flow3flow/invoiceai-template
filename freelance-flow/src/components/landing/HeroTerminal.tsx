// src/components/landing/HeroTerminal.tsx

// ─── Desktop : 3 logs condensés + facture complète ─────────────────────────
function TerminalDesktop() {
    const keyLogs = [
      { type: "info",    text: "BCE ✓  BE0883660134 · actif · Peppol endpoint trouvé · 0208:0883660134" },
      { type: "success", text: "TVA ✓  Domestic B2B · 21% · FIE decimal.js · INV-2026-0042 · sans trou" },
      { type: "success", text: "UBL ✓  BIS Billing 3.0 · validé · Audit log · 2026-03-28T14:22:11Z" },
    ]
  
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-[#090f1e] overflow-hidden shadow-[0_8px_48px_rgba(0,0,0,0.5)] text-left">
  
        {/* Barre titre */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-[#0d1526] border-b border-white/5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
          <span className="ml-3 font-mono text-[11px] text-white/25">invoiceai — generate</span>
        </div>
  
        <div className="p-5 space-y-4">
  
          {/* 3 logs condensés */}
          <div className="space-y-1.5">
            {keyLogs.map((l, i) => (
              <div
                key={i}
                className={`font-mono text-[11px] leading-5 ${
                  l.type === "info" ? "text-blue-400" : "text-emerald-400"
                }`}
              >
                {l.text}
              </div>
            ))}
          </div>
  
          {/* Bloc facture */}
          <div className="rounded-lg border border-white/10 bg-[#0e1a30] p-4 space-y-3">
  
            <div className="flex justify-between items-start">
              <div>
                <div className="font-mono text-[12px] text-amber-400 font-semibold">INV-2026-0042</div>
                <div className="font-mono text-[10px] text-white/25 mt-0.5">28 mars 2026</div>
              </div>
              <span className="font-mono text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded">
                ✓ UBL READY
              </span>
            </div>
  
            <div className="grid grid-cols-2 gap-4 py-3 border-y border-white/5">
              <div>
                <p className="font-mono text-[9px] text-white/25 uppercase tracking-widest mb-1">Émetteur</p>
                <p className="text-[13px] text-white font-semibold leading-tight">Flow Solutions</p>
                <p className="font-mono text-[10px] text-white/35">BE0123456789</p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-white/25 uppercase tracking-widest mb-1">Client</p>
                <p className="text-[13px] text-white font-semibold leading-tight">Acme SA</p>
                <p className="font-mono text-[10px] text-white/35">BE0883660134</p>
              </div>
            </div>
  
            <div className="flex justify-between items-center text-[12px]">
              <span className="text-white/45">Dev Sprint #14 — 12j × 500€</span>
              <span className="font-mono text-white/65">6 000,00 €</span>
            </div>
  
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/30">Sous-total HT</span>
                <span className="font-mono text-white/50">6 000,00 €</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-white/30">TVA 21% BE</span>
                <span className="font-mono text-white/50">1 260,00 €</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-amber-500/20">
                <span className="text-[13px] font-bold text-white">TOTAL TTC</span>
                <span className="font-mono text-[18px] text-amber-400 font-semibold">7 260,00 €</span>
              </div>
            </div>
          </div>
  
          {/* Badge Peppol */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-blue-500/25 bg-blue-500/8 font-mono text-[11px] text-blue-400">
            <span className="text-[14px] leading-none shrink-0">◈</span>
            <span>Peppol endpoint: 0208:0883660134 · UBL 2.1 · BIS Billing 3.0</span>
          </div>
  
          {/* Ligne finale */}
          <div className="font-mono text-[12px] text-emerald-400 font-semibold flex items-center gap-2">
            <span>✓ Facture prête · PDF + UBL · Peppol-ready</span>
            <span className="w-2 h-3.5 bg-amber-400 animate-pulse rounded-sm" />
          </div>
  
        </div>
      </div>
    )
  }
  
  // ─── Mobile : header + facture compacte + badge Peppol + ligne finale ───────
  function TerminalMobile() {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-[#090f1e] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)] text-left">
  
        {/* Barre titre */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0d1526] border-b border-white/5">
          <span className="h-2 w-2 rounded-full bg-red-500/60" />
          <span className="h-2 w-2 rounded-full bg-amber-500/60" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
          <span className="ml-2 font-mono text-[10px] text-white/25">invoiceai — INV-2026-0042</span>
        </div>
  
        <div className="p-4 space-y-3">
  
          {/* Facture compacte */}
          <div className="rounded-lg border border-white/10 bg-[#0e1a30] p-3 space-y-2.5">
  
            <div className="flex justify-between items-center">
              <div className="font-mono text-[11px] text-amber-400 font-semibold">INV-2026-0042</div>
              <span className="font-mono text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded">
                ✓ UBL READY
              </span>
            </div>
  
            <div className="grid grid-cols-2 gap-3 py-2.5 border-y border-white/5">
              <div>
                <p className="font-mono text-[9px] text-white/25 uppercase tracking-widest mb-0.5">Émetteur</p>
                <p className="text-[12px] text-white font-semibold">Flow Solutions</p>
                <p className="font-mono text-[10px] text-white/35">BE0123456789</p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-white/25 uppercase tracking-widest mb-0.5">Client</p>
                <p className="text-[12px] text-white font-semibold">Acme SA</p>
                <p className="font-mono text-[10px] text-white/35">BE0883660134</p>
              </div>
            </div>
  
            <div className="space-y-1 pt-1 border-t border-white/5">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/30">TVA 21% BE</span>
                <span className="font-mono text-white/50">1 260,00 €</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-amber-500/20">
                <span className="text-[12px] font-bold text-white">TOTAL TTC</span>
                <span className="font-mono text-[16px] text-amber-400 font-semibold">7 260,00 €</span>
              </div>
            </div>
          </div>
  
          {/* Badge Peppol */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-blue-500/25 bg-blue-500/8 font-mono text-[10px] text-blue-400">
            <span className="shrink-0">◈</span>
            <span>UBL 2.1 · BIS 3.0 · Peppol-ready</span>
          </div>
  
          {/* Ligne finale — présente en mobile aussi */}
          <div className="font-mono text-[11px] text-emerald-400 font-semibold flex items-center gap-2">
            <span>✓ Facture prête · PDF + UBL · Peppol-ready</span>
            <span className="w-1.5 h-3 bg-amber-400 animate-pulse rounded-sm" />
          </div>
  
        </div>
      </div>
    )
  }
  
  // ─── Export : switch responsive, largeur gérée par le parent ────────────────
  export function HeroTerminal() {
    return (
      <>
        <div className="hidden md:block w-full">
          <TerminalDesktop />
        </div>
        <div className="md:hidden w-full">
          <TerminalMobile />
        </div>
      </>
    )
  }