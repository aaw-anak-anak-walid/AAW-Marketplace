import { z, ZodObject, ZodRawShape } from "zod";
import { RequestHandler, Request, Response, NextFunction } from "express";
import type { ParsedQs } from "qs";
import logger from "@src/config/logger";

const COMPONENT_NAME = "ValidationMiddleware";

export function validate<S extends ZodObject<ZodRawShape>>(
  schema: S
): RequestHandler<
  "params" extends keyof S["shape"] ? z.infer<S["shape"]["params"]> : {},
  any,
  "body" extends keyof S["shape"] ? z.infer<S["shape"]["body"]> : {},
  "query" extends keyof S["shape"]
  ? z.infer<S["shape"]["query"]> & ParsedQs
  : ParsedQs
> {
  return async (req: Request, res: Response, next: NextFunction) => {
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
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        logger.info("Request validation failed", {
          originalUrl: req.originalUrl,
          method: req.method,
          errors: err.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
          ip: req.ip,
          component: COMPONENT_NAME
        });
        return res.status(400).json({
          message: "Validation errors in your request",
          errors: err.issues,
        });
      }
      logger.error("Unexpected error during request validation", {
        originalUrl: req.originalUrl,
        method: req.method,
        errorMessage: err.message,
        errorName: err.name,
        stack: err.stack,
        ip: req.ip,
        component: COMPONENT_NAME
      });
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}