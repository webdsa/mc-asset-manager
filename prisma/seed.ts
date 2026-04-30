import { PrismaClient } from "../src/generated/prisma/client";
import { createPrismaDriverAdapter } from "../src/lib/prisma-driver-adapter";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL é obrigatório para o seed.");
}

const prisma = new PrismaClient({
  adapter: createPrismaDriverAdapter(connectionString),
});

const categories = [
  { name: "Equipamentos", color: "#2563eb" },
  { name: "Iluminação", color: "#f59e0b" },
  { name: "Áudio", color: "#10b981" },
  { name: "Cenografia", color: "#ef4444" },
  { name: "Decoração", color: "#8b5cf6" },
  { name: "Mobiliário", color: "#64748b" },
  { name: "Produção", color: "#14b8a6" },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { color: category.color },
      create: category,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
