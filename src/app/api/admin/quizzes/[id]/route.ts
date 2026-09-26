import { adminCrud } from "@/lib/admin-crud";
import { quizSchema } from "@/lib/validation";

const crud = adminCrud("quizzes", quizSchema);
export const PATCH = crud.update;
export const DELETE = crud.remove;
