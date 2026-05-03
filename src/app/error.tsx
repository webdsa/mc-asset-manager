"use client";

function isDatabaseUnreachable(error: Error): boolean {
  const msg = error.message ?? "";
  const code = "code" in error ? String((error as { code?: string }).code) : "";
  const cause = error.cause instanceof Error ? error.cause.message : String(error.cause ?? "");
  return (
    code === "ECONNREFUSED" ||
    msg.includes("ECONNREFUSED") ||
    cause.includes("ECONNREFUSED") ||
    msg.includes("Can't reach database") ||
    msg.includes("connect ECONNREFUSED")
  );
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dbDown = isDatabaseUnreachable(error);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900">
        {dbDown ? "Banco de dados indisponível" : "Algo deu errado"}
      </h1>
      {dbDown ? (
        <p className="max-w-md text-slate-600">
          O PostgreSQL não está aceitando conexões. Inicie o Docker Desktop, depois rode{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">npm run db:up</code> na
          pasta do projeto e, na primeira vez,{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">npm run db:push</code> e{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">npm run db:seed</code>.
        </p>
      ) : (
        <p className="max-w-md text-slate-600">{error.message}</p>
      )}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
      >
        Tentar de novo
      </button>
    </div>
  );
}
