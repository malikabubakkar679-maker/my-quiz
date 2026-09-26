import { adminCrud } from "@/lib/admin-crud";
import { questionSchema } from "@/lib/validation";

const crud = adminCrud("questions", questionSchema);
export const PATCH = crud.update;
export const DELETE = crud.remove;
