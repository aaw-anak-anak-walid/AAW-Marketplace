import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import logger from "../config/logger"; 

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
        logger.warn("Validation failed", {
          component: COMPONENT_NAME,
          path: req.path,
          method: req.method,
          errors: error.issues,
          requestBody: req.body,
          requestQuery: req.query,
          requestParams: req.params,
        });
        res.status(400).json({
          message: "Validation errors in your request",
          errors: error.issues,
        });
      } else {
        logger.error("Internal server error during validation", {
          component: COMPONENT_NAME,
          path: req.path,
          method: req.method,
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
          requestBody: req.body,
          requestQuery: req.query,
          requestParams: req.params,
        });
        res.status(500).json({message: "Internal server error"});
      }
    }
  };
};