// src/middleware/validate.ts
import { z, ZodObject, ZodRawShape } from "zod";
import { Request, Response, NextFunction, RequestHandler } from "express";

export function validate<S extends ZodObject<ZodRawShape>>(
  schema: S
): RequestHandler<
  // params
  "params" extends keyof S["shape"] ? z.infer<S["shape"]["params"]> : {},
  // response (ignored)
  any,
  // body
  "body" extends keyof S["shape"] ? z.infer<S["shape"]["body"]> : {},
  // query
  "query" extends keyof S["shape"] ? z.infer<S["shape"]["query"]> : {}
> {
  return async (req, res, next) => {
    try {
      // Parse exactly the parts your schema cares about
      const result = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Overwrite with the _validated_ & coerced values
      if (result.body) req.body = result.body;
      if (result.query) req.query = result.query;
      if (result.params) req.params = result.params;

      next();
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
