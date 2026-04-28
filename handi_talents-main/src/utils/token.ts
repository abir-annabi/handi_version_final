import crypto from "crypto";

export const genererTokenActivation = (): string => crypto.randomBytes(32).toString("hex");
