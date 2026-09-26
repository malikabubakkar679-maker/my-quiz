import { adminCrud } from "@/lib/admin-crud";
import { courseSchema } from "@/lib/validation";

export const POST = adminCrud("courses", courseSchema).create;
