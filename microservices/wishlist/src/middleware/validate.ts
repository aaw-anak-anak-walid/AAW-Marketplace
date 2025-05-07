// src/middleware/validate.ts
import { z, ZodObject, ZodRawShape } from "zod";
import { RequestHandler, Request, Response, NextFunction } from "express";
import type { ParsedQs } from "qs";
export function validate<S extends ZodObject<ZodRawShape>>(
  schema: S
): RequestHandler<
  // params
  "params" extends keyof S["shape"] ? z.infer<S["shape"]["params"]> : {},
  any,
  // body
  "body" extends keyof S["shape"] ? z.infer<S["shape"]["body"]> : {},
  // query: now we intersect with ParsedQs so it always extends it
  "query" extends keyof S["shape"]
    ? z.infer<S["shape"]["query"]> & ParsedQs
    : ParsedQs
> {
  return async (req, res, next) => {
    try {
      const result = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (result.body) req.body = result.body;
      if (result.query) req.query = result.query;
      if (result.params) req.params = result.params;

      return next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation errors in your request",
          errors: err.issues,
        });
      }
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}
