import { Router } from "express";
import { supabaseIsConfigured } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "coolab-api",
    database: supabaseIsConfigured ? "configured" : "setup_required",
    timestamp: new Date().toISOString()
  });
});
