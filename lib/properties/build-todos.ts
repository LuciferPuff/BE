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

  // Endast delar som behöver koll (action/watch) — håller listan kort.
  for (const part of input.parts) {
    if (part.tone !== "action" && part.tone !== "watch") continue;

    const key = `part_${part.key}`;
    const state = stateByKey.get(key);
    items.push({
      key,
      title:
        input.ownershipStatus === "funderar"
          ? `Kolla ${part.label.toLowerCase()} inför köp`
          : `Åtgärda eller verifiera ${part.label.toLowerCase()}`,
      description: `${part.ageLabel}. ${part.statusLabel}.`,
      priority: 15 + (part.tone === "action" ? 0 : 5),
      href: `/profil/${input.propertyId}?del=${part.key}`,
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
} {
  if (!input.constructionYear) {
    return {
      title: "Ange byggår",
      body: "Med byggår kan vi anta ålder på tak, fasad och övriga delar.",
      ctaLabel: "Ange byggår",
      ctaHref: "redigera",
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

  // Äger
  if (input.nextPart) {
    return {
      title: `När byttes ${input.nextPart.label.toLowerCase()}?`,
      body: "Svara så räknar vi om husets risker och underhåll.",
      ctaLabel: `Uppdatera ${input.nextPart.label.toLowerCase()}`,
      ctaHref: `?del=${input.nextPart.key}`,
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
