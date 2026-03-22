import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // env() is Prisma's helper — correctly resolves DATABASE_URL for validate and migrate
    url: env("DATABASE_URL"),
  },
});
