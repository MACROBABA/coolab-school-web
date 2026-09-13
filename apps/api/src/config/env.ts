import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_ANON_KEY: z.string().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal(""))
});

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Mühit dəyişənləri düzgün deyil:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const supabaseIsConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
