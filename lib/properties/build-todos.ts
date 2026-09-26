import {
  pickNextPartAction,
  type PropertyPartView,
} from "@/lib/properties/build-property-parts";
import {
  partLabelDefinite,
  PART_NEXT_STEP_PRIORITY,
} from "@/lib/properties/component-lifespans";
import type { OwnershipStatus } from "@/lib/properties/labels";
import type { PropertyPartKey } from "@/lib/properties/parts-catalog";

export type TodoKind = "manual" | "auto";

export type PropertyTodoItem = {
  key: string;
  title: string;
  description: string;
  priority: number;
  href?: string;
  completed: boolean;
  /** Manuella handlingar får kryssruta. Auto (t.ex. verifiera delar) inte. */
  kind: TodoKind;
  source: "template" | "season" | "verify";
};

const MANUAL_TEMPLATES: {
  key: string;
  title: string;
  description: string;
  phase: OwnershipStatus | "both";
  priority: number;
  requiresAnalysis?: boolean;
}[] = [
  {
    key: "funderar_questions",
    title: "Förbered frågor till säljaren",
    description:
      "Tak, dränering, tätskikt och el – fråga vad som bytts och när.",
    phase: "funderar",
    priority: 10,
  },
  {
    key: "funderar_inspection",
    title: "Boka eller planera besiktning",
    description:
      "En överlåtelsebesiktning fångar det som annonsen inte säger.",
    phase: "funderar",
    priority: 20,
  },
  {
    key: "funderar_review_analysis",
    title: "Gå igenom AI-analysen inför visning",
    description: "Markera det du vill dubbelkolla på plats.",
    phase: "funderar",
    priority: 30,
    requiresAnalysis: true,
  },
  {
    key: "funderar_mark_bought",
    title: "När du köpt: markera att du äger huset",
    description:
      "Då byter Att göra till underhåll och planen följer med.",
    phase: "funderar",
    priority: 90,
  },
  {
    key: "ager_collect_docs",
    title: "Samla papper och kvitton",
    description:
      "Besiktning, energideklaration och renoveringskvitton (uppladdning kommer).",
    phase: "ager",
    priority: 40,
  },
];

type SeasonTodo = {
  key: string;
  title: string;
  description: string;
  priority: number;
  months: number[];
};

const SEASON_TODOS: SeasonTodo[] = [
  {
    key: "season_hangrannor",
    title: "Rensa hängrännor och kontrollera takavvattning före vintern",
    description: "Minskar risken för isdämmor och fuktskador.",
    priority: 12,
    months: [9, 10, 11],
  },
  {
    key: "season_radon",
    title: "Radonmät – eldningssäsongen är rätt period",
    description: "Mät under eldningssäsongen för tillförlitligt resultat.",
    priority: 14,
    months: [10, 11, 12, 1, 2, 3, 4],
  },
  {
    key: "season_after_winter",
    title: "Kontrollera taket och fasaden efter vintern",
    description: "Titta efter sprickor, lösa pannor och fuktfläckar.",
    priority: 12,
    months: [3, 4, 5],
  },
  {
    key: "season_summer",
    title: "Kontrollera tätningar och målning ute",
    description: "Bäst väder för utvändigt underhåll.",
    priority: 12,
    months: [6, 7, 8],
  },
];

export type TodoStateRow = {
  task_key: string;
  completed_at: string | null;
  note: string | null;
};

function firstUnverifiedPart(
  parts: PropertyPartView[],
): PropertyPartView | null {
  const byKey = new Map(parts.map((p) => [p.key, p]));
  for (const key of PART_NEXT_STEP_PRIORITY) {
    const part = byKey.get(key);
    if (part && part.source !== "verified") return part;
  }
  return null;
}

export function buildPropertyTodos(input: {
  ownershipStatus: OwnershipStatus;
  hasAnalysis: boolean;
  parts: PropertyPartView[];
  states: TodoStateRow[];
  propertyId: string;
  /** Override för tester. 1–12. */
  month?: number;
}): PropertyTodoItem[] {
  const stateByKey = new Map(
    input.states.map((s) => [s.task_key, s]),
  );
  const month = input.month ?? new Date().getMonth() + 1;
  const items: PropertyTodoItem[] = [];

  const verifiedCount = input.parts.filter((p) => p.source === "verified")
    .length;
  const totalParts = input.parts.length;
  const allVerified = totalParts > 0 && verifiedCount === totalParts;
  const nextUnverified = firstUnverifiedPart(input.parts);

  items.push({
    key: "verify_parts",
    title: `Verifiera husets delar (${verifiedCount}/${totalParts})`,
    description: allVerified
      ? "Alla delar är verifierade."
      : nextUnverified
        ? `Nästa: ange när ${partLabelDefinite(nextUnverified.key)} byttes.`
        : "Fyll i bytt år för husets delar.",
    priority: 5,
    href: nextUnverified
      ? `/profil/${input.propertyId}?del=${nextUnverified.key}`
      : `#husets-delar`,
    completed: allVerified,
    kind: "auto",
    source: "verify",
  });

  for (const template of MANUAL_TEMPLATES) {
    if (template.phase !== "both" && template.phase !== input.ownershipStatus) {
      continue;
    }
    if (template.requiresAnalysis && !input.hasAnalysis) continue;
    const state = stateByKey.get(template.key);
    items.push({
      key: template.key,
      title: template.title,
      description: template.description,
      priority: template.priority,
      completed: Boolean(state?.completed_at),
      kind: "manual",
      source: "template",
    });
  }

  if (input.ownershipStatus === "ager") {
    for (const season of SEASON_TODOS) {
      if (!season.months.includes(month)) continue;
      const state = stateByKey.get(season.key);
      items.push({
        key: season.key,
        title: season.title,
        description: season.description,
        priority: season.priority,
        completed: Boolean(state?.completed_at),
        kind: "manual",
        source: "season",
      });
    }
  }

  return items.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.priority - b.priority;
  });
}

export function pickNextStep(input: {
  ownershipStatus: OwnershipStatus;
  constructionYear: number | null;
  nextPart: PropertyPartView | null;
  hasAnalysis: boolean;
  openTodos: PropertyTodoItem[];
}): {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref?: string;
  showBoughtButton?: boolean;
  tone?: "default" | "warning";
  partKey?: PropertyPartKey;
} {
  if (!input.constructionYear) {
    return {
      title: "Ange byggår",
      body: "Utan byggår kan vi inte uppskatta ålder på husets delar.",
      ctaLabel: "Ange byggår",
      ctaHref: "redigera",
      tone: "warning",
    };
  }

  if (input.ownershipStatus === "funderar") {
    const firstOpen = input.openTodos.find(
      (t) => !t.completed && t.kind === "manual",
    );
    if (firstOpen) {
      return {
        title: firstOpen.title,
        body: firstOpen.description,
        ctaLabel: "Se Att göra",
        ctaHref: "#att-gora",
        showBoughtButton: true,
      };
    }
    if (!input.hasAnalysis) {
      return {
        title: "Analysera huset inför köp",
        body: "En AI-analys ger riskflaggor du kan ta med till visningen.",
        ctaLabel: "Analysera",
        ctaHref: "/analys",
        showBoughtButton: true,
      };
    }
    return {
      title: "Har du köpt huset?",
      body: "Markera ägarskap så byter Att göra till underhåll och planen följer med.",
      ctaLabel: "Jag köpte huset",
      showBoughtButton: true,
    };
  }

  if (input.nextPart && input.nextPart.source !== "verified") {
    const definite = partLabelDefinite(input.nextPart.key);
    return {
      title: `När byttes ${definite}?`,
      body:
        input.nextPart.prompt ??
        `${input.nextPart.statusLabel}: ${input.nextPart.ageLabel}.`,
      ctaLabel: `Ange när ${definite} byttes`,
      ctaHref: `?del=${input.nextPart.key}`,
      tone: "warning",
      partKey: input.nextPart.key,
    };
  }

  if (input.nextPart && input.nextPart.source === "verified") {
    const definite = partLabelDefinite(input.nextPart.key);
    return {
      title: `Planera ${definite}`,
      body: `${input.nextPart.statusLabel}: ${input.nextPart.ageLabel}.`,
      ctaLabel: `Öppna ${definite}`,
      ctaHref: `?del=${input.nextPart.key}`,
      tone: "warning",
      partKey: input.nextPart.key,
    };
  }

  const open = input.openTodos.find((t) => !t.completed && t.kind === "manual");
  if (open) {
    return {
      title: open.title,
      body: open.description,
      ctaLabel: "Se Att göra",
      ctaHref: "#att-gora",
    };
  }

  return {
    title: "Allt är ifyllt",
    body: "Vi påminner dig när något närmar sig.",
    ctaLabel: "Se husets delar",
    ctaHref: "#husets-delar",
  };
}

/** Exporterad för tester. */
export { firstUnverifiedPart, pickNextPartAction };
