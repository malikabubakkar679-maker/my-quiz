import { adminCrud } from "@/lib/admin-crud";
import { questionSchema } from "@/lib/validation";

export const POST = adminCrud("questions", questionSchema).create;
