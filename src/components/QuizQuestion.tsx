import { Check } from "lucide-react";
import type { AnswerKey, PlayQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

export const KEYS: AnswerKey[] = ["A", "B", "C", "D"];

export function optionText(q: PlayQuestion, k: AnswerKey) {
  return q[`option_${k.toLowerCase()}` as "option_a"];
}

export function QuizOption({ letter, text, selected, disabled, onSelect }: { letter: AnswerKey; text: string; selected: boolean; disabled?: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "group flex min-h-16 w-full items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.99] disabled:cursor-not-allowed",
        selected ? "border-brand bg-brand/20 shadow-[0_0_0_4px_rgba(124,92,255,0.15)]" : "border-line bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
      )}
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display font-bold transition", selected ? "bg-brand-gradient text-white" : "bg-white/[0.06] text-muted group-hover:text-white")}>
        {selected ? <Check className="size-5" /> : letter}
      </span>
      <span className="text-[15px] font-medium sm:text-base">{text}</span>
    </button>
  );
}

export function QuizQuestion({ question, index, total, selected, disabled, onSelect }: { question: PlayQuestion; index: number; total: number; selected?: AnswerKey; disabled?: boolean; onSelect: (k: AnswerKey) => void }) {
  return (
    <div key={question.id} className="animate-fade-up">
      <p className="text-sm font-medium text-violet-300">Question {index + 1} of {total}</p>
      <h2 className="mt-2 mb-6 font-display text-xl leading-snug font-semibold sm:text-2xl">{question.question_text}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {KEYS.map((k) => (
          <QuizOption key={k} letter={k} text={optionText(question, k)} selected={selected === k} disabled={disabled} onSelect={() => onSelect(k)} />
        ))}
      </div>
    </div>
  );
}
