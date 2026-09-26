import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { HttpError } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const DB_ERRORS: Record<string, [number, string]> = {
  attempt_not_found: [404, "Quiz attempt not found."],
  attempt_submitted: [409, "This quiz has already been submitted."],
  attempt_expired: [409, "Time is up for this quiz."],
  attempt_not_started: [409, "The quiz has not started yet."],
  invalid_question: [400, "Invalid question."],
  invalid_answer: [400, "Invalid answer."],
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof HttpError) return fail(err.status, err.message);
  if (err instanceof ZodError) return fail(400, err.issues[0]?.message ?? "Invalid input.", { issues: err.issues });
  if (err && typeof err === "object" && "message" in err) {
    const msg = String((err as { message: unknown }).message);
    const code = "code" in err ? String((err as { code: unknown }).code) : "";
    const known = DB_ERRORS[msg];
    if (known) return fail(known[0], known[1]);
    if (code === "23505") return fail(409, "That value is already taken.");
  }
  console.error(err);
  return fail(500, "Something went wrong. Please try again.");
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
  return schema.parse(body);
}

export function limit(key: string, max: number, windowMs = 60_000) {
  if (!rateLimit(key, max, windowMs)) throw new HttpError(429, "Too many requests. Please slow down.");
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler with consistent error handling. */
export function route<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return handleError(err);
    }
  };
}
