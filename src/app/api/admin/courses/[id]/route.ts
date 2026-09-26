import { adminCrud } from "@/lib/admin-crud";
import { courseSchema } from "@/lib/validation";

const crud = adminCrud("courses", courseSchema);
export const PATCH = crud.update;
export const DELETE = crud.remove;
