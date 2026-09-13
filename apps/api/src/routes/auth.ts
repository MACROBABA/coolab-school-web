import { Router } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../lib/supabase.js";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  requestedRole: z.enum(["parent", "student", "mentor"])
});

export const authRouter = Router();

authRouter.post("/sign-up", async (req, res, next) => {
  const parsed = signUpSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      fields: parsed.error.flatten().fieldErrors
    });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(503).json({
      error: "AUTH_NOT_CONFIGURED",
      message: "Supabase bağlantısı hələ əlavə edilməyib. apps/api/.env faylını doldurun."
    });
  }

  try {
    const { email, password, firstName, lastName, requestedRole } = parsed.data;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          requested_role: requestedRole
        }
      }
    });

    if (error) {
      return res.status(400).json({ error: "SIGN_UP_FAILED", message: error.message });
    }

    return res.status(201).json({
      message: "Təsdiq e-poçtu göndərildi. Hesab admin təsdiqindən sonra aktivləşəcək.",
      userId: data.user?.id ?? null,
      verificationRequired: !data.session
    });
  } catch (error) {
    return next(error);
  }
});
