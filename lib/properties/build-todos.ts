import type { OwnershipStatus } from "@/lib/properties/labels";
import type { PropertyPartView } from "@/lib/properties/build-property-parts";
import {
  parseTodoNotes,
  type TodoNoteEntry,
} from "@/lib/properties/todo-notes";

export type TodoPhase = "funderar" | "ager" | "both";

export type TodoTemplate = {
  key: string;
  title: string;
  description: string;
  phase: TodoPhase;
  /** Lägre = högre prio i listan. */
  priority: number;
  href?: string;
};

/** Statiska Att göra-punkter per fas. */
export const TODO_TEMPLATES: readonly TodoTemplate[] = [
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
    key: "ager_season_check",
    title: "Gör en säsongskoll av huset",
    description:
      "Tak, hängrännor, ventilation och värmesystem – små åtgärder i tid.",
    phase: "ager",
    priority: 10,
  },
  {
    key: "ager_verify_parts",
    title: "Verifiera husets delar",
    description:
      "Byggår ger antaganden. Fyll i verkliga bytesår där du kan.",
    phase: "ager",
    priority: 20,
  },
  {
    key: "ager_collect_docs",
    title: "Samla papper och kvitton",
    description:
      "Besiktning, energideklaration och renoveringskvitton (uppladdning kommer).",
    phase: "ager",
    priority: 40,
  },
] as const;

export type PropertyTodoItem = {
  key: string;
  title: string;
  description: string;
  priority: number;
  href?: string;
  completed: boolean;
  notes: TodoNoteEntry[];
  source: "template" | "part";
};

export type TodoStateRow = {
  task_key: string;
  completed_at: string | null;
  note: string | null;
};

export function buildPropertyTodos(input: {
  ownershipStatus: OwnershipStatus;
  hasAnalysis: boolean;
  parts: PropertyPartView[];
  states: TodoStateRow[];
  propertyId: string;
}): PropertyTodoItem[] {
  const stateByKey = new Map(
    input.states.map((s) => [s.task_key, s]),
  );

  const items: PropertyTodoItem[] = [];

  for (const template of TODO_TEMPLATES) {
    if (template.phase !== "both" && template.phase !== input.ownershipStatus) {
      continue;
    }
    if (
      template.key === "funderar_review_analysis" &&
      !input.hasAnalysis
    ) {
      continue;
    }

    const state = stateByKey.get(template.key);
    items.push({
      key: template.key,
      title: template.title,
      description: template.description,
      priority: template.priority,
      href: template.href,
      completed: Boolean(state?.completed_at),
      notes: parseTodoNotes(state?.note),
      source: "template",
    });
  }

  // Larm: verifierad action/soon, eller likely/unknown som mjuk komplettering.
  // assumed_ok skapar inte Att göra-punkter.
  for (const part of input.parts) {
    if (
      part.tone !== "action" &&
      part.tone !== "soon" &&
      part.tone !== "likely" &&
      part.tone !== "unknown"
    ) {
      continue;
    }

    const key = `part_${part.key}`;
    const state = stateByKey.get(key);
    const isSoft = part.tone === "likely" || part.tone === "unknown";
    items.push({
      key,
      title: isSoft
        ? `Verifiera ${part.label.toLowerCase()}`
        : part.tone === "soon"
          ? `Planera ${part.label.toLowerCase()}`
          : `Åtgärda eller verifiera ${part.label.toLowerCase()}`,
      description: part.prompt
        ? part.prompt
        : `${part.ageLabel}. ${part.statusLabel}.`,
      priority:
        part.tone === "action"
          ? 12
          : part.tone === "soon"
            ? 16
            : part.tone === "likely"
              ? 22
              : 28,
      href: `#husets-delar`,
      completed: Boolean(state?.completed_at),
      notes: parseTodoNotes(state?.note),
      source: "part",
    });
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
} {
  if (!input.constructionYear) {
    return {
      title: "Saknar byggår",
      body: "Utan byggår kan vi inte uppskatta ålder på tak, fasad och övriga delar. Fyll i det under uppgifter.",
      ctaLabel: "Ange byggår",
      ctaHref: "redigera",
      tone: "warning",
    };
  }

  if (input.ownershipStatus === "funderar") {
    const firstOpen = input.openTodos.find((t) => !t.completed);
    if (firstOpen?.href) {
      return {
        title: firstOpen.title,
        body: firstOpen.description,
        ctaLabel: "Öppna",
        ctaHref: firstOpen.href,
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

  // Äger — saknad/osäker husdel: varning, inte auto-öppnad panel.
  if (input.nextPart) {
    const soft =
      input.nextPart.tone === "likely" ||
      input.nextPart.tone === "unknown" ||
      input.nextPart.tone === "assumed_ok";
    return {
      title: soft
        ? `Komplettera ${input.nextPart.label.toLowerCase()}`
        : `Kolla ${input.nextPart.label.toLowerCase()}`,
      body: input.nextPart.prompt
        ? input.nextPart.prompt
        : soft
          ? `${input.nextPart.label} är ${input.nextPart.statusLabel.toLowerCase()} (${input.nextPart.ageLabel.toLowerCase()}). Ange bytt år under Husets delar så blir riskbilden mer träffsäker.`
          : `${input.nextPart.label}: ${input.nextPart.statusLabel}. ${input.nextPart.ageLabel}.`,
      ctaLabel: "Gå till husets delar",
      ctaHref: "#husets-delar",
      tone: "warning",
    };
  }

  const open = input.openTodos.find((t) => !t.completed);
  if (open) {
    return {
      title: open.title,
      body: open.description,
      ctaLabel: open.href ? "Öppna" : "Se Att göra",
      ctaHref: open.href ?? "#att-gora",
    };
  }

  if (!input.hasAnalysis) {
    return {
      title: "Analysera huset",
      body: "Koppla en AI-analys för en första riskbild.",
      ctaLabel: "Analysera",
      ctaHref: "/analys",
    };
  }

  return {
    title: "Bra läge",
    body: "Husets delar och Att göra är ifyllda. Kom tillbaka när något byts.",
    ctaLabel: "Öppna senaste analysen",
    ctaHref: "latest-analysis",
  };
}
