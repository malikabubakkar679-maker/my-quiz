import { adminCrud } from "@/lib/admin-crud";
import { quizSchema } from "@/lib/validation";

export const POST = adminCrud("quizzes", quizSchema).create;
