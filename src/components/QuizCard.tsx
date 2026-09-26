import { Clock, HelpCircle, Play, Swords, Users } from "lucide-react";
import { ButtonLink, DifficultyBadge } from "@/components/ui";
import { formatDuration } from "@/lib/utils";

export function QuizCard({ quiz, best }: { quiz: { id: string; title: string; description: string | null; difficulty: string; duration: number; question_count: number }; best?: number | null }) {
  return (
    <div className="glass flex flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">{quiz.title}</h3>
        <DifficultyBadge value={quiz.difficulty} />
      </div>
      {quiz.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{quiz.description}</p>}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><HelpCircle className="size-3.5" /> {quiz.question_count} questions</span>
        <span className="flex items-center gap-1.5"><Clock className="size-3.5" /> {formatDuration(quiz.duration)}</span>
        {best != null && <span className="text-emerald-300">Best: {best}%</span>}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <ButtonLink href={`/quiz?quiz=${quiz.id}`} size="sm" className="col-span-3 sm:col-span-1"><Play className="size-4" /> Start</ButtonLink>
        <ButtonLink href={`/rooms/create?quiz=${quiz.id}`} size="sm" variant="secondary" className="col-span-3 sm:col-span-1 sm:px-2 sm:text-xs"><Users className="size-4" /> Room</ButtonLink>
        <ButtonLink href={`/challenge?quiz=${quiz.id}`} size="sm" variant="secondary" className="col-span-3 sm:col-span-1 sm:px-2 sm:text-xs"><Swords className="size-4" /> Challenge</ButtonLink>
      </div>
    </div>
  );
}
