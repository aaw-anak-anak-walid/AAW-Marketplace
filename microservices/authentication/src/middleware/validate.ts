import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import logger from "@src/config/logger";

const COMPONENT_NAME = "ValidationMiddleware";

export const validate = (schema: z.Schema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.info("Request validation failed", {
          originalUrl: req.originalUrl,
          method: req.method,
          errors: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
          ip: req.ip,
          component: COMPONENT_NAME
        });
        res.status(400).json({
          message: "Validation errors in your request",
          errors: error.issues,
        });
      } else {
        const err = error as Error;
        logger.error("Unexpected error during request validation", {
          originalUrl: req.originalUrl,
          method: req.method,
          errorMessage: err.message,
          errorName: err.name,
          stack: err.stack,
          ip: req.ip,
          component: COMPONENT_NAME
        });
        res.status(500).json({ message: "Internal server error" });
      }
    }
  };
};