import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Required in Prisma v6.19 — tells Prisma to use the classic Rust engine
  // and enables datasource URL to be set here instead of schema.prisma
  engine: "classic",
  datasource: {
    // env() is Prisma's helper — correctly resolves DATABASE_URL for validate and migrate
    url: env("DATABASE_URL"),
  },
});
