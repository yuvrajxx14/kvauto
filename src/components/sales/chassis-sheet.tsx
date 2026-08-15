import { DEALER } from "@/lib/print";
import { seeded, type ChassisAppearance } from "@/lib/chassis";

export type ChassisSheetData = {
  chassis: string;
  model?: string | null;
  variant?: string | null;
  engine?: string | null;
  customer?: string | null;
  bookingNumber?: string | null;
  deliveryInfo?: string | null;
  generatedBy?: string | null;
  generatedAt?: Date;
};

const SIZE_MM = { 1: 11, 2: 15, 3: 19 } as const;
const SPACING_MM = { 1: 0.6, 2: 1.6, 3: 3 } as const;
const TEXTURE_ALPHA = { CLEAN: 0, LIGHT: 0.18, MEDIUM: 0.34, HEAVY: 0.5 } as const;
const DISTRESS_AMT = { LOW: 0.35, MEDIUM: 0.75, HIGH: 1.2 } as const;

/** A4 printable width (210mm) minus sheet padding. */
const CONTENT_MM = 210 - 2 * 14;

export function ChassisSheet({
  data,
  appearance,
}: {
  data: ChassisSheetData;
  appearance: ChassisAppearance;
}) {
  const chars = data.chassis.split("");
  const spacing = SPACING_MM[appearance.spacing as 1 | 2 | 3] ?? SPACING_MM[2];
  const stretch = appearance.stretch / 100;
  let fontMm = SIZE_MM[appearance.size as 1 | 2 | 3] ?? SIZE_MM[2];

  // Fit-to-width: never truncate, shrink until the whole number fits the page.
  const widthFor = (f: number) => chars.length * (f * 0.62 * stretch + spacing);
  if (chars.length && widthFor(fontMm) > CONTENT_MM) {
    fontMm = Math.max(4, (CONTENT_MM / chars.length - spacing) / (0.62 * stretch));
  }

  const distress = DISTRESS_AMT[appearance.distress] ?? DISTRESS_AMT.MEDIUM;
  const pressure = appearance.pressure; // 1..3
  const grain = TEXTURE_ALPHA[appearance.texture] ?? TEXTURE_ALPHA.MEDIUM;
  const at = data.generatedAt ?? new Date();

  return (
    <div
      className="print-area chassis-sheet relative overflow-hidden bg-white text-black"
      style={{ width: "210mm", minHeight: "297mm", padding: "14mm", boxSizing: "border-box" }}
    >
      {/* watermark — always rendered, cannot be disabled */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 5 }}
      >
        <div
          style={{
            transform: "rotate(-28deg)",
            color: "rgba(180,30,30,0.16)",
            fontSize: "16mm",
            lineHeight: 1.15,
            fontWeight: 800,
            letterSpacing: "1mm",
            textAlign: "center",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          DIGITAL REFERENCE
          <br />
          NOT ORIGINAL CHASSIS IMPRESSION
        </div>
      </div>

      <header style={{ textAlign: "center", borderBottom: "1px solid #000", paddingBottom: "4mm" }}>
        <h1 style={{ fontSize: "6mm", fontWeight: 700, letterSpacing: "0.4mm" }}>{DEALER.name}</h1>
        <p style={{ fontSize: "3mm", opacity: 0.75 }}>{DEALER.tagline}</p>
        <p style={{ fontSize: "3mm", opacity: 0.75 }}>{DEALER.address}</p>
        <p style={{ marginTop: "3mm", fontSize: "4.2mm", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8mm" }}>
          Chassis Number Digital Reference
        </p>
      </header>

      <section
        style={{
          marginTop: "10mm",
          border: "0.6mm solid #111",
          borderRadius: "2mm",
          padding: "8mm 4mm",
          background: "#fbfbf9",
          overflow: "hidden",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            transform: `rotate(-${appearance.rotation}deg)`,
          }}
        >
          {chars.map((ch, i) => {
            const r1 = seeded(data.chassis, i, 1);
            const r2 = seeded(data.chassis, i, 2);
            const r3 = seeded(data.chassis, i, 3);
            const r4 = seeded(data.chassis, i, 4);
            const opacity = 0.55 + 0.12 * pressure + (r1 - 0.5) * 0.35 * distress;
            return (
              <span
                key={`${ch}-${i}`}
                style={{
                  fontFamily: "'Courier New', ui-monospace, monospace",
                  fontWeight: 700,
                  fontSize: `${fontMm}mm`,
                  lineHeight: 1,
                  marginRight: `${spacing}mm`,
                  display: "inline-block",
                  transform: `translateY(${((r2 - 0.5) * 1.6 * distress).toFixed(2)}mm) rotate(${((r3 - 0.5) * 4 * distress).toFixed(2)}deg) scaleX(${stretch.toFixed(3)})`,
                  color: `rgba(28,28,30,${Math.min(0.95, Math.max(0.28, opacity)).toFixed(2)})`,
                  textShadow: `0.12mm 0.1mm 0 rgba(60,60,60,${(0.25 * distress).toFixed(2)}), -0.1mm -0.08mm 0 rgba(120,120,120,${(0.3 * distress).toFixed(2)})`,
                  filter: `blur(${(0.04 + r4 * 0.06 * distress).toFixed(3)}mm)`,
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>

        {grain > 0 && (
          <div
            aria-hidden
            style={{
              position: "relative",
              marginTop: "-12mm",
              height: "12mm",
              opacity: grain,
              backgroundImage:
                "repeating-linear-gradient(92deg, rgba(0,0,0,0.35) 0 0.15mm, rgba(0,0,0,0) 0.15mm 0.7mm), repeating-linear-gradient(3deg, rgba(0,0,0,0.22) 0 0.1mm, rgba(0,0,0,0) 0.1mm 0.9mm)",
              mixBlendMode: "multiply",
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            }}
          />
        )}

        <p style={{ marginTop: "6mm", textAlign: "center", fontSize: "3mm", letterSpacing: "0.4mm", opacity: 0.7 }}>
          RENDERED DIGITALLY FROM DEALERSHIP RECORDS — NOT A PHYSICAL RUBBING
        </p>
      </section>

      <section style={{ marginTop: "10mm", fontSize: "3.6mm" }}>
        <Row label="Vehicle Model" value={[data.model, data.variant].filter(Boolean).join(" ") || "—"} />
        <Row label="Chassis Number" value={data.chassis || "—"} />
        <Row label="Engine Number" value={data.engine || "—"} />
        <Row label="Customer" value={data.customer || "—"} />
        <Row label="Booking / Delivery No" value={data.bookingNumber || data.deliveryInfo || "—"} />
        <Row
          label="Generated On"
          value={`${at.toLocaleDateString("en-GB")} ${at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
        />
        <Row label="Generated By" value={data.generatedBy || "—"} />
      </section>

      <footer
        style={{
          position: "absolute",
          left: "14mm",
          right: "14mm",
          bottom: "14mm",
          border: "0.6mm solid rgba(180,30,30,0.9)",
          color: "rgba(150,20,20,1)",
          padding: "3mm",
          textAlign: "center",
          fontWeight: 800,
          fontSize: "4mm",
          letterSpacing: "0.5mm",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        DIGITAL REFERENCE — NOT ORIGINAL CHASSIS IMPRESSION
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "6mm", borderBottom: "0.2mm dashed #999", padding: "1.8mm 0" }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}
