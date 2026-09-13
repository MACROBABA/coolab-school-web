import type { ErrorRequestHandler, RequestHandler } from "express";

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `${req.method} ${req.originalUrl} üçün endpoint tapılmadı.`
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Gözlənilməz xəta baş verdi."
  });
};
