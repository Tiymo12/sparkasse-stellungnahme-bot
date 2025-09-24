type Borrower = {
  id: string;
  name: string;
  family: string;
  housing: string;
  jobEmployer: string;
  employedSince: string;
  netIncome: string;
  otherIncomeDesc?: string;
  otherIncomeAmount?: string;
  customerSince: string;
  mainBank: string;
  accountBehavior: string;
  currentAddress?: string; // falls du das Feld eingeführt hast
};
import OpenAI from "openai";
import { NextResponse } from "next/server";

// Templates
const WB_TEMPLATE = `Beispiel-Stil Wohnbaufinanzierung: Abschnitte, formell, wie in den Vorlagen.`;
const KK_TEMPLATE = `Beispiel-Stil Konsumkredit: Abschnitte, kürzer, wie in den Vorlagen.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { finType, borrowers, globalData, scoring, risk, securities, ksv } = body;

    const borrowersBlock = (borrowers as Borrower[]).map((b: Borrower, idx: number) => {

      const addInc = b.otherIncomeDesc && b.otherIncomeAmount
        ? `Weitere Einkünfte: ${b.otherIncomeDesc} i.H.v. EUR ${b.otherIncomeAmount} mtl.`
        : `Weitere Einkünfte: keine/ohne Relevanz`;
      return `- ${b.name}: ${b.family}; Wohnsituation: ${b.housing}. Beruf & Arbeitgeber: ${b.jobEmployer}. Beschäftigt seit ${b.employedSince}, mtl. Nettoeinkommen EUR ${b.netIncome}. ${addInc}. Kunde seit ${b.customerSince}; Hauptbank: ${b.mainBank}; Kontoverhalten: ${b.accountBehavior}.`;
    }).join("\n");

    const crifLine = risk.crif.has
      ? `CRIF: ja/wesentlich – ${risk.crif.reason ?? "Begründung fehlt"}`
      : `CRIF: nein/unwesentlich`;

    const ksvBlock = ksv.count === 0
      ? `KSV: 0`
      : ksv.entries.map((e, i) =>
        `KSV-Eintrag ${i+1}: ${e.kind} über ${e.amountTEUR} TEUR, erste Rate ${e.firstPayment}, LZ ${e.termMonths} Mon., KN: ${e.borrower}`
      ).join("\n");

    let projectBlock = "", konditionenBlock = "", konsBlock = "";
    if (finType === "Wohnbaufinanzierung") {
      const gp = Number(globalData.kaufpreisTEUR||0);
      const nk = Number(globalData.nebenkostenTEUR||0);
      const san = Number(globalData.sanierungTEUR||0);
      const pu = Number(globalData.puTEUR||0);
      const ek = Number(globalData.ekTEUR||0);
      const gesamt = gp + nk + san + pu;
      const kreditbed = Math.max(0, gesamt - ek);
      const bagEUR = Math.round(kreditbed * 1000 * 0.01);

      projectBlock = [
        `Die Projektkosten setzen sich zusammen:`,
        `- ${gp} TEUR Kaufpreis`,
        `- ${nk} TEUR Nebenkosten`,
        `- ${san} TEUR Sanierung`,
        `- ${pu} TEUR PU inkl. Beglaubigung`,
        `= ${gesamt} TEUR Gesamtprojekt`,
        `+ ${ek} TEUR Eigenmittel`,
        `= ${kreditbed} TEUR benötigtes Finanzierungsvolumen`
      ].join("\n");

      konditionenBlock = [
        `Folgende Konditionen:`,
        `- SZ ${globalData.fixzinsProzent}% fix ${globalData.fixzinsJahre} Jahre bis ${globalData.fixzinsEnde}, danach variabel: ${globalData.variabelText}`,
        `- BAG = EUR ${bagEUR} / Quartal`,
        `- Sondertilgung: ${globalData.sondertilgungErlaubt}`
      ].join("\n");
    } else {
      konsBlock = `KN benötigt Finanzierung über ${globalData.kreditbetragTEUR} TEUR für ${globalData.antragszweck}. Eigenmittel: ${globalData.ekTEUR} TEUR.`;
    }

    const ratingsLines = borrowers.map((b, i) => {
      const r = scoring[`rating_${i+1}`] || "entfällt";
      const kbs = scoring[`kbs_${i+1}`] || "";
      return `${b.name}: Rating ${r}${kbs ? ` | KBS: ${kbs}` : ""}`;
    }).join("\n");

    const systemPrompt = `
Du bist Kreditsachbearbeiter einer Sparkasse. Schreibe eine Stellungnahme (Antragszweck, Person, Geschäftsbeziehungen, Haushaltsplan, Forbearance, Besicherung, Gesamturteil).
Nutze Formulierungen wie in den Beispielen.
Pflicht:
- "weiteres Potential in der Geschäftsverbindung" ins Gesamturteil
- "CM2 und CM4 Daten bitte aus BON entnehmen" ins Gesamturteil
${finType === "Wohnbaufinanzierung" ? WB_TEMPLATE : KK_TEMPLATE}
`;

    const userContent = `
Finanzierungsart: ${finType}

Bearbeiter: ${globalData.bearbeiter}
Bewilligung: ${globalData.bewilligung}

${finType === "Wohnbaufinanzierung" ? `Adresse: ${globalData.adresse}\n${projectBlock}\n${konditionenBlock}` : konsBlock}

-- Kreditnehmer --
${borrowersBlock}

-- Haushalt --
HHR: ${risk.hh}
UKV: ${risk.ukv}
${crifLine}
${ksvBlock}

-- Forbearance --
${risk.forbearanceText}

-- Sicherheiten --
${securities}

-- Kennzahlen --
BELQ: ${scoring.belq}%
DSTI: ${scoring.dsti}%
LTV: ${scoring.ltv}%
EIFA: ${scoring.eifa}%
${ratingsLines}

Besondere Gründe:
${scoring.reasons}
`;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    return NextResponse.json({ text: resp.choices[0]?.message?.content ?? "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Fehler" }, { status: 500 });
  }
}
