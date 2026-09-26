"use client";

import { useState } from "react";
import { Check, ChevronDown, Minus, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { AnswerKey, Question } from "@/lib/types";
import { cn } from "@/lib/utils";

const KEYS: AnswerKey[] = ["A", "B", "C", "D"];

export function AnswerReview({ questions, answers }: { questions: Question[]; answers: Record<string, AnswerKey> }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full sm:w-auto">
        View Detailed Answers <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </Button>
      {open && (
        <ol className="animate-fade-up mt-4 space-y-3">
          {questions.map((q, i) => {
            const mine = answers[q.id];
            const status = !mine ? "skip" : mine === q.correct_answer ? "ok" : "bad";
            return (
              <li key={q.id} className="rounded-2xl border border-line bg-white/[0.02] p-4">
                <div className="flex items-start gap-3">
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", status === "ok" ? "bg-success/20 text-emerald-300" : status === "bad" ? "bg-danger/20 text-rose-300" : "bg-white/10 text-muted")}>
                    {status === "ok" ? <Check className="size-4" /> : status === "bad" ? <X className="size-4" /> : <Minus className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium"><span className="text-muted">{i + 1}.</span> {q.question_text}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {KEYS.map((k) => {
                        const text = q[`option_${k.toLowerCase()}` as "option_a"];
                        const correct = k === q.correct_answer;
                        const picked = k === mine;
                        return (
                          <div key={k} className={cn("rounded-lg border px-3 py-2 text-sm", correct ? "border-success/40 bg-success/10" : picked ? "border-danger/40 bg-danger/10" : "border-line text-muted")}>
                            <b className="mr-2">{k}</b>{text}
                            {picked && <span className="ml-2 text-xs opacity-70">(your answer)</span>}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && <p className="mt-3 text-sm text-muted"><b className="text-white/80">Explanation:</b> {q.explanation}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
