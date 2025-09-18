"use client";

import { useMemo, useState } from "react";

type FinType = "Wohnbaufinanzierung" | "Konsumkredit";

type Borrower = {
  id: string;
  name: string;
  currentAddress: string;
  family: string;            // Familienstand & Kinder
  housing: string;           // Wohnsituation
  jobEmployer: string;       // Beruf & Arbeitgeber
  employedSince: string;     // Beschäftigt seit (YYYY-MM-DD)
  netIncome: string;         // Monatsnetto EUR
  otherIncomeDesc?: string;  // z.B. Mieteinnahmen, Familienbeihilfe
  otherIncomeAmount?: string;// EUR
  customerSince: string;     // Seit wann Kunde (YYYY-MM-DD)
  mainBank: string;          // Hauptbank
  accountBehavior: string;   // Kontoverhalten
};

type KsvEntry = {
  id: string;
  kind: string;         // z.B. Konsumkredit / Wohnbaufinanzierung
  amountTEUR: string;   // Betrag in TEUR
  firstPayment: string; // Erste Rate (YYYY-MM-DD)
  termMonths: string;   // Laufzeit in Monaten
  borrower: string;     // Name aus Liste oder "beide"
};

export default function Home() {
  // Schrittsteuerung
  const [step, setStep] = useState(0);

  // 0) Finanzierungsart
  const [finType, setFinType] = useState<FinType | "">("");

  // 1) Kreditnehmeranzahl
  const [borrowerCount, setBorrowerCount] = useState<number>(1);

  // 2) Kreditnehmerdetails
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);

  // 3) Finanzierungsdaten + Allgemeines
  const [globalData, setGlobalData] = useState<any>({
    // Wohnbau
    adresse: "",              // Objektadresse (zu erwerben)
    kaufpreisTEUR: "",
    nebenkostenTEUR: "",
    sanierungTEUR: "",
    puTEUR: "",
    ekTEUR: "",
    fixzinsProzent: "",
    fixzinsJahre: "",
    fixzinsEnde: "",          // YYYY-MM-DD
    variabelText: "",         // z.B. "2,25 % über 6M-Euribor"
    sondertilgungErlaubt: "Nein",
    // Konsum
    antragszweck: "",
    kreditbetragTEUR: "",
    // Allgemein
    bearbeiter: "",
    bewilligung: "",
  });

  // 4) Haushalt / Auskünfte / Forbearance
  const [risk, setRisk] = useState<any>({
    hh: "",
    ukv: "",
    crif: { has: false, reason: "" },
    forbearanceText: "",
  });

  // 5) KSV
  const [ksv, setKsv] = useState<{ count: number; entries: KsvEntry[] }>({
    count: 0,
    entries: [],
  });

  // 6) Sicherheiten
  const [securities, setSecurities] = useState<string>("");

  // 7) Kennzahlen & Gründe
  const [scoring, setScoring] = useState<any>({
    belq: "",
    dsti: "",
    ltv: "",
    eifa: "",
    reasons: "",
    // dynamisch: rating_1, rating_2, kbs_1, kbs_2 …
  });

  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Optionen
  const kontoverhaltenOptions = [
    "äußerst positiv",
    "positiv",
    "durchwachsen",
    "häufige Überziehungen",
  ];

  const borrowerNames = useMemo(
    () => borrowers.map((b) => b.name).filter(Boolean),
    [borrowers]
  );

  // Helper
  const newId = () => Math.random().toString(36).slice(2, 10);

  // ---------- Submit-Handler pro Step (lesen per FormData) ----------

  // Step 1: Anzahl Kreditnehmer speichern
  const submitStep1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const count = Math.max(
      1,
      Math.min(4, parseInt(String(fd.get("borrowerCount") || "1"), 10))
    );

    setBorrowerCount(count);
    // Slots aufbauen/trimmen
    setBorrowers((prev) => {
      const arr = [...prev];
      while (arr.length < count) {
        arr.push({
          id: newId(),
          name: "",
          currentAddress: "",
          family: "",
          housing: "",
          jobEmployer: "",
          employedSince: "",
          netIncome: "",
          otherIncomeDesc: "",
          otherIncomeAmount: "",
          customerSince: "",
          mainBank: "",
          accountBehavior: "",
        });
      }
      return arr.slice(0, count);
    });

    setStep(2);
  };

  // Step 2: Borrower-Form auslesen
  const submitStep2 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next: Borrower[] = [];

    for (let i = 0; i < borrowerCount; i++) {
      next.push({
        id: borrowers[i]?.id || newId(),
        name: String(fd.get(`b_${i}_name`) || ""),
        currentAddress: String(fd.get(`b_${i}_currentAddress`) || ""),
        family: String(fd.get(`b_${i}_family`) || ""),
        housing: String(fd.get(`b_${i}_housing`) || ""),
        jobEmployer: String(fd.get(`b_${i}_jobEmployer`) || ""),
        employedSince: String(fd.get(`b_${i}_employedSince`) || ""),
        netIncome: String(fd.get(`b_${i}_netIncome`) || ""),
        otherIncomeDesc: String(fd.get(`b_${i}_otherIncomeDesc`) || ""),
        otherIncomeAmount: String(fd.get(`b_${i}_otherIncomeAmount`) || ""),
        customerSince: String(fd.get(`b_${i}_customerSince`) || ""),
        mainBank: String(fd.get(`b_${i}_mainBank`) || ""),
        accountBehavior: String(fd.get(`b_${i}_accountBehavior`) || ""),
      });
    }
    setBorrowers(next);
    setStep(3);
  };

  // Step 3: Global/Antragszweck speichern
  const submitStep3 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const next = { ...globalData };
    next.bearbeiter = String(fd.get("bearbeiter") || "");
    next.bewilligung = String(fd.get("bewilligung") || "");

    if (finType === "Wohnbaufinanzierung") {
      next.adresse = String(fd.get("adresse") || "");
      next.kaufpreisTEUR = String(fd.get("kaufpreisTEUR") || "");
      next.nebenkostenTEUR = String(fd.get("nebenkostenTEUR") || "");
      next.sanierungTEUR = String(fd.get("sanierungTEUR") || "");
      next.puTEUR = String(fd.get("puTEUR") || "");
      next.ekTEUR = String(fd.get("ekTEUR") || "");
      next.fixzinsProzent = String(fd.get("fixzinsProzent") || "");
      next.fixzinsJahre = String(fd.get("fixzinsJahre") || "");
      next.fixzinsEnde = String(fd.get("fixzinsEnde") || "");
      next.variabelText = String(fd.get("variabelText") || "");
      next.sondertilgungErlaubt = String(fd.get("sondertilgungErlaubt") || "Nein");
    } else {
      next.antragszweck = String(fd.get("antragszweck") || "");
      next.kreditbetragTEUR = String(fd.get("kreditbetragTEUR") || "");
      next.ekTEUR = String(fd.get("ekTEUR") || "");
    }

    setGlobalData(next);
    setStep(4);
  };

  // Step 4: Haushalt / CRIF / KSV / Forbearance / Sicherheiten speichern
  const submitStep4 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const nextRisk = { ...risk };
    nextRisk.hh = String(fd.get("hh") || "");
    nextRisk.ukv = String(fd.get("ukv") || "");
    const crifHas = String(fd.get("crif_has") || "nein") === "ja";
    nextRisk.crif = {
      has: crifHas,
      reason: crifHas ? String(fd.get("crif_reason") || "") : "",
    };
    nextRisk.forbearanceText = String(fd.get("forbearanceText") || "");

    const ksvCount = Math.max(
      0,
      parseInt(String(fd.get("ksv_count") || "0"), 10) || 0
    );
    const entries: KsvEntry[] = [];
    for (let i = 0; i < ksvCount; i++) {
      entries.push({
        id: ksv.entries[i]?.id || newId(),
        kind: String(fd.get(`ksv_${i}_kind`) || ""),
        amountTEUR: String(fd.get(`ksv_${i}_amountTEUR`) || ""),
        firstPayment: String(fd.get(`ksv_${i}_firstPayment`) || ""),
        termMonths: String(fd.get(`ksv_${i}_termMonths`) || ""),
        borrower: String(fd.get(`ksv_${i}_borrower`) || ""),
      });
    }

    setRisk(nextRisk);
    setKsv({ count: ksvCount, entries });

    const nextSec = String(fd.get("securities") || "");
    setSecurities(nextSec);

    setStep(5);
  };

  // Step 5: Kennzahlen & Gründe speichern + Generieren
  const submitStep5 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const nextScoring = { ...scoring };
    for (let i = 0; i < borrowerCount; i++) {
      nextScoring[`rating_${i + 1}`] = String(fd.get(`rating_${i}`) || "");
      nextScoring[`kbs_${i + 1}`] = String(fd.get(`kbs_${i}`) || "");
    }
    nextScoring.belq = String(fd.get("belq") || "");
    nextScoring.dsti = String(fd.get("dsti") || "");
    nextScoring.ltv = String(fd.get("ltv") || "");
    nextScoring.eifa = String(fd.get("eifa") || "");
    nextScoring.reasons = String(fd.get("reasons") || "");
    setScoring(nextScoring);

    // API-Aufruf
    setLoading(true);
    setResult("");
    try {
      const payload = {
        finType: finType as FinType,
        borrowers,
        globalData,
        scoring: nextScoring,
        risk,
        securities,
        ksv,
      };

      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Server lieferte kein JSON:\n" + text);
      }

      if (!resp.ok && data?.error) {
        throw new Error(data.error);
      }
      setResult(data.text || "Kein Text erhalten.");
    } catch (e: any) {
      setResult("Fehler: " + (e.message || e.toString()));
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI-Bausteine (uncontrolled Inputs – TAB funktioniert automatisch) ----------

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="bg-white rounded-xl shadow p-6 mb-6">
      <h2 className="text-xl font-semibold text-sky-700 mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );

  const UInput = ({
    label,
    name,
    type = "text",
    placeholder,
    defaultValue,
    hint,
  }: {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    defaultValue?: string | number;
    hint?: string;
  }) => (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue as any}
        className="border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-sky-300"
      />
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </label>
  );

  const USelect = ({
    label,
    name,
    defaultValue,
    hint,
    children,
  }: {
    label: string;
    name: string;
    defaultValue?: string;
    hint?: string;
    children: React.ReactNode;
  }) => (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-gray-600">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-sky-300"
      >
        {children}
      </select>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </label>
  );

  const UTextarea = ({
    label,
    name,
    placeholder,
    defaultValue,
    hint,
  }: {
    label: string;
    name: string;
    placeholder?: string;
    defaultValue?: string;
    hint?: string;
  }) => (
    <label className="flex flex-col gap-1 md:col-span-2">
      <span className="text-sm text-gray-600">{label}</span>
      <textarea
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-sky-300 min-h-[90px]"
      />
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </label>
  );

  // ---------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-red-700">Sparkasse Stellungnahme-Bot</h1>
          <p className="text-gray-600">
            Automatisierte, formelle Stellungnahmen für Wohnbaufinanzierungen und Konsumkredite.
          </p>
        </header>

        {/* === Step 0: Finanzierungsart === */}
        {step === 0 && (
          <Section title="1) Finanzierungsart">
            <div className="md:col-span-2 flex gap-3">
              <button
                className={`px-4 py-2 rounded ${finType === "Wohnbaufinanzierung" ? "bg-sky-700 text-white" : "bg-gray-200"}`}
                onClick={() => setFinType("Wohnbaufinanzierung")}
              >
                Wohnbaufinanzierung
              </button>
              <button
                className={`px-4 py-2 rounded ${finType === "Konsumkredit" ? "bg-orange-600 text-white" : "bg-gray-200"}`}
                onClick={() => setFinType("Konsumkredit")}
              >
                Konsumkredit
              </button>
            </div>
            <div className="md:col-span-2 flex justify-end mt-2">
              <button
                className="px-5 py-2 rounded bg-green-600 text-white disabled:opacity-50"
                disabled={!finType}
                onClick={() => setStep(1)}
              >
                Weiter
              </button>
            </div>
          </Section>
        )}

        {/* === Step 1: Anzahl Kreditnehmer === */}
        {step === 1 && (
          <form onSubmit={submitStep1}>
            <Section title="2) Kreditnehmer">
              <UInput
                label="Wie viele Kreditnehmer gibt es?"
                name="borrowerCount"
                type="number"
                defaultValue={borrowerCount}
                placeholder="1–4"
                hint="Gib 1–4 ein. Für jede Person werden die Fragen separat angezeigt."
              />
              <div className="md:col-span-2 flex justify-between mt-2">
                <button type="button" className="px-5 py-2 rounded bg-gray-200" onClick={() => setStep(0)}>
                  Zurück
                </button>
                <button type="submit" className="px-5 py-2 rounded bg-green-600 text-white">
                  Weiter
                </button>
              </div>
            </Section>
          </form>
        )}

        {/* === Step 2: Details pro Kreditnehmer === */}
        {step === 2 && (
          <form onSubmit={submitStep2}>
            <Section title="3) Person & Kunden- und Geschäftsbeziehungen">
              {Array.from({ length: borrowerCount }).map((_, idx) => {
                const b = borrowers[idx];
                return (
                  <div key={b?.id || idx} className="md:col-span-2 border rounded-lg p-4 mb-2">
                    <h3 className="font-semibold text-sky-700 mb-2">Kreditnehmer {idx + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <UInput label="Name" name={`b_${idx}_name`} defaultValue={b?.name} />
                      <UInput label="Aktuelle Adresse (Wohnadresse)" name={`b_${idx}_currentAddress`} defaultValue={b?.currentAddress} hint="Straße Hausnummer, PLZ Ort" />
                      <UInput label="Familienstand & Kinder" name={`b_${idx}_family`} defaultValue={b?.family} placeholder="z. B. ledig; verheiratet; 2 Kinder" />
                      <UInput label="Wohnsituation" name={`b_${idx}_housing`} defaultValue={b?.housing} placeholder="z. B. Mieter, Eigentumswohnung, eigenes Haus" />
                      <UInput label="Beruf & Arbeitgeber" name={`b_${idx}_jobEmployer`} defaultValue={b?.jobEmployer} placeholder='z. B. "Lehrer, NMS Horn"' />
                      <UInput label="Beschäftigt seit" name={`b_${idx}_employedSince`} type="date" defaultValue={b?.employedSince} />
                      <UInput label="Monatliches Nettoeinkommen (EUR)" name={`b_${idx}_netIncome`} type="number" defaultValue={b?.netIncome} placeholder="z. B. 2300" />
                      <UInput label="Weitere Einkünfte (Art)" name={`b_${idx}_otherIncomeDesc`} defaultValue={b?.otherIncomeDesc} placeholder="z. B. Mieteinnahmen, Familienbeihilfe" />
                      <UInput label="Weitere Einkünfte (EUR/Monat)" name={`b_${idx}_otherIncomeAmount`} type="number" defaultValue={b?.otherIncomeAmount} placeholder="z. B. 350" />
                      <UInput label="Seit wann Kunde" name={`b_${idx}_customerSince`} type="date" defaultValue={b?.customerSince} />
                      <UInput label="Hauptbankverbindung" name={`b_${idx}_mainBank`} defaultValue={b?.mainBank} placeholder="z. B. Sparkasse Horn; Fremdbank …" />
                      <USelect label="Kontoverhalten" name={`b_${idx}_accountBehavior`} defaultValue={b?.accountBehavior}>
                        <option value="">— bitte wählen —</option>
                        {kontoverhaltenOptions.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </USelect>
                    </div>
                  </div>
                );
              })}
              <div className="md:col-span-2 flex justify-between mt-2">
                <button type="button" className="px-5 py-2 rounded bg-gray-200" onClick={() => setStep(1)}>
                  Zurück
                </button>
                <button type="submit" className="px-5 py-2 rounded bg-green-600 text-white">
                  Weiter
                </button>
              </div>
            </Section>
          </form>
        )}

        {/* === Step 3: Antragszweck & Konditionen === */}
        {step === 3 && (
          <form onSubmit={submitStep3}>
            <Section title="4) Antragszweck & Konditionen">
              <UInput label="Bearbeiter (Empfehlung)" name="bearbeiter" defaultValue={globalData.bearbeiter} placeholder="z. B. Kubicek Timo" />
              <UInput label="Bewilligung – Grund" name="bewilligung" defaultValue={globalData.bewilligung} placeholder='z. B. "AA grün" / "Vorstand a.G. Sonderkondition …"' />

              {finType === "Wohnbaufinanzierung" ? (
                <>
                  <UInput label="Adresse der Liegenschaft (zu erwerben)" name="adresse" defaultValue={globalData.adresse} placeholder="Straße Hausnummer, PLZ Ort" />
                  <UInput label="Kaufpreis lt. KV (in TEUR)" name="kaufpreisTEUR" type="number" defaultValue={globalData.kaufpreisTEUR} placeholder="z. B. 320" />
                  <UInput label="Nebenkosten (in TEUR)" name="nebenkostenTEUR" type="number" defaultValue={globalData.nebenkostenTEUR} placeholder="z. B. 15" />
                  <UInput label="Sanierungskosten (in TEUR)" name="sanierungTEUR" type="number" defaultValue={globalData.sanierungTEUR} placeholder="0 wenn keine" />
                  <UInput label="Eintragung PU inkl. Beglaubigung (in TEUR)" name="puTEUR" type="number" defaultValue={globalData.puTEUR} placeholder="z. B. 2" />
                  <UInput label="Eigenmitteleinbringung (in TEUR)" name="ekTEUR" type="number" defaultValue={globalData.ekTEUR} placeholder="z. B. 60" />
                  <UInput label="Fixzinssatz in %" name="fixzinsProzent" type="number" defaultValue={globalData.fixzinsProzent} placeholder="z. B. 3,25" />
                  <UInput label="Fixzins-Bindung (in Jahren)" name="fixzinsJahre" type="number" defaultValue={globalData.fixzinsJahre} placeholder="z. B. 10" />
                  <UInput label="Enddatum der Fixzinsbindung" name="fixzinsEnde" type="date" defaultValue={globalData.fixzinsEnde} />
                  <UInput label="Variable Verzinsung nach Fixzins" name="variabelText" defaultValue={globalData.variabelText} placeholder='z. B. "2,25 % über 6M-Euribor"' />
                  <USelect label="Pönalefreie Sondertilgungen erlaubt?" name="sondertilgungErlaubt" defaultValue={globalData.sondertilgungErlaubt}>
                    <option value="Ja">Ja</option>
                    <option value="Nein">Nein</option>
                  </USelect>
                </>
              ) : (
                <>
                  <UInput label="Antragszweck" name="antragszweck" defaultValue={globalData.antragszweck} placeholder="z. B. Gebrauchtwagen, Möbel …" />
                  <UInput label="Kreditbetrag (in TEUR)" name="kreditbetragTEUR" type="number" defaultValue={globalData.kreditbetragTEUR} placeholder="z. B. 20" />
                  <UInput label="Eigenmitteleinbringung (in TEUR)" name="ekTEUR" type="number" defaultValue={globalData.ekTEUR} placeholder="0 wenn keine" />
                </>
              )}

              <div className="md:col-span-2 flex justify-between mt-2">
                <button type="button" className="px-5 py-2 rounded bg-gray-200" onClick={() => setStep(2)}>
                  Zurück
                </button>
                <button type="submit" className="px-5 py-2 rounded bg-green-600 text-white">
                  Weiter
                </button>
              </div>
            </Section>
          </form>
        )}

        {/* === Step 4: Haushalt / Auskünfte / KSV / Forbearance / Sicherheiten === */}
        {step === 4 && (
          <form onSubmit={submitStep4}>
            <Section title="5) Haushalt & Auskünfte">
              <UInput label="Ergebnis der Haushaltsrechnung (HHR)" name="hh" defaultValue={risk.hh} placeholder='z. B. "+350 EUR" oder "negativ −120 EUR"' />
              <UInput label="UKV" name="ukv" defaultValue={risk.ukv} placeholder="z. B. 0" />
              <USelect label="CRIF-Einträge vorhanden?" name="crif_has" defaultValue={risk.crif.has ? "ja" : "nein"}>
                <option value="nein">nein</option>
                <option value="ja">ja</option>
              </USelect>
              {risk.crif.has && (
                <UInput label="CRIF – Begründung (wesentlich weil …)" name="crif_reason" defaultValue={risk.crif.reason} placeholder="kurze Begründung" />
              )}

              <UInput label="Anzahl KSV-Einträge" name="ksv_count" type="number" defaultValue={ksv.count} placeholder="0, 1, 2, …" />
              {Array.from({ length: Math.max(0, ksv.count) }).map((_, i) => {
                const entry = ksv.entries[i];
                return (
                  <div key={entry?.id || i} className="md:col-span-2 border rounded p-3">
                    <h4 className="font-semibold text-gray-700 mb-2">KSV-Eintrag {i + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <UInput label="Kreditart" name={`ksv_${i}_kind`} defaultValue={entry?.kind} placeholder='z. B. "Konsumkredit" / "Wohnbaufinanzierung"' />
                      <UInput label="Kreditbetrag (in TEUR)" name={`ksv_${i}_amountTEUR`} type="number" defaultValue={entry?.amountTEUR} placeholder="z. B. 20" />
                      <UInput label="Erste Rate / Zahlung (Datum)" name={`ksv_${i}_firstPayment`} type="date" defaultValue={entry?.firstPayment} />
                      <UInput label="Laufzeit (Monate)" name={`ksv_${i}_termMonths`} type="number" defaultValue={entry?.termMonths} placeholder="z. B. 120" />
                      <USelect label="Kreditnehmer (KN) zugeordnet" name={`ksv_${i}_borrower`} defaultValue={entry?.borrower}>
                        <option value="">— bitte wählen —</option>
                        {borrowerNames.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                        {borrowerNames.length > 1 && <option value="beide">beide</option>}
                      </USelect>
                    </div>
                  </div>
                );
              })}
            </Section>

            <Section title="6) Fin. Schwierigkeiten / Sicherheiten">
              <UTextarea
                label="Finanzielle Schwierigkeiten / Forbearance (Ja/Nein + Begründung)"
                name="forbearanceText"
                defaultValue={risk.forbearanceText}
                placeholder='z. B. "keine — reine Wohnraumschaffung"'
              />
              <UTextarea
                label="Sicherheiten (einzelne Punkte)"
                name="securities"
                defaultValue={securities}
                placeholder='z. B. "stille Gehaltsverpfändung; Pfandrecht Liegenschaft; Er- & Ablebensversicherung …"'
              />
              <div className="md:col-span-2 flex justify-between mt-2">
                <button type="button" className="px-5 py-2 rounded bg-gray-200" onClick={() => setStep(3)}>
                  Zurück
                </button>
                <button type="submit" className="px-5 py-2 rounded bg-green-600 text-white">
                  Weiter
                </button>
              </div>
            </Section>
          </form>
        )}

        {/* === Step 5: Kennzahlen, Ratings, Gründe === */}
        {step === 5 && (
          <form onSubmit={submitStep5}>
            <Section title="7) Kennzahlen, Ratings & Gründe">
              {borrowers.map((b, idx) => (
                <div key={b.id} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border rounded p-3">
                  <h4 className="md:col-span-2 font-semibold text-gray-700">
                    Kreditnehmer {idx + 1}: {b.name || "(Name fehlt)"}
                  </h4>
                  <UInput label="Rating (vor → nach), z. B. A1 → A1" name={`rating_${idx}`} defaultValue={scoring[`rating_${idx + 1}`] || ""} />
                  <UInput label="KBS nach Finanzierung" type="number" name={`kbs_${idx}`} defaultValue={scoring[`kbs_${idx + 1}`] || ""} />
                </div>
              ))}

              <UInput label="BELQ in %" type="number" name="belq" defaultValue={scoring.belq} />
              <UInput label="DSTI in %" type="number" name="dsti" defaultValue={scoring.dsti} />
              <UInput label="LTV in %" type="number" name="ltv" defaultValue={scoring.ltv} />
              <UInput label="EIFA in %" type="number" name="eifa" defaultValue={scoring.eifa} />

              <UTextarea
                label="Besondere Gründe für Empfehlung/Bewilligung"
                name="reasons"
                defaultValue={scoring.reasons}
                placeholder={`Beispiele:
- Leistbarkeit gegeben – positive HH-Rechnung nach Finanzierung (+…)
- Positives Kontogebaren, Vereinbarungen werden eingehalten
- Ordentliche Rückführungen in der Vergangenheit
- Besserung der Situation absehbar (z. B. nach Karenz)
- Besicherungsgrad …%
- keine externen Negativa bekannt
- Cross-Selling (Hauptbankwechsel, Versicherung)
- weiteres Potential in der Geschäftsverbindung`}
              />

              <div className="md:col-span-2 flex justify-between mt-2">
                <button type="button" className="px-5 py-2 rounded bg-gray-200" onClick={() => setStep(4)}>
                  Zurück
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-green-600 text-white disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Generiere Stellungnahme…" : "Stellungnahme generieren"}
                </button>
              </div>
            </Section>
          </form>
        )}

        {/* === Ergebnis === */}
        {result && (
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-sky-700 mb-4">Generierte Stellungnahme</h2>
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </section>
        )}
      </div>
    </main>
  );
}
