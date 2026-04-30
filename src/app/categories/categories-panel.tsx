import Link from "next/link";
import { ArrowLeft, Tags, Trash2 } from "lucide-react";
import { createCategory, deleteCategory, updateCategory } from "@/app/actions";
import { CategoryColorField } from "@/app/categories/category-color-field";

export type CategoryListRow = {
  id: string;
  name: string;
  color: string;
  itemCount: number;
};

const fieldClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

export function CategoriesPanel({ categories }: { categories: CategoryListRow[] }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft size={17} />
            Voltar ao inventário
          </Link>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <Tags size={20} />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-500">Configuração</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
                Categorias
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Nome e cor aparecem nos chips do inventário e nos formulários de itens.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Nova categoria
          </h2>
          <form action={createCategory} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="new-category-name" className="text-xs font-medium text-slate-600">
                Nome
              </label>
              <input
                id="new-category-name"
                name="name"
                type="text"
                required
                autoComplete="off"
                className={`${fieldClass} mt-1`}
                placeholder="Ex.: Transporte"
              />
            </div>
            <div className="shrink-0">
              <label htmlFor="new-category-color" className="text-xs font-medium text-slate-600">
                Cor
              </label>
              <CategoryColorField id="new-category-color" defaultHex="#64748b" />
            </div>
            <button
              type="submit"
              className="h-10 shrink-0 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Adicionar
            </button>
          </form>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Categorias cadastradas
          </h2>
          {categories.length ? (
            <ul className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white shadow-sm">
              {categories.map((cat) => (
                <li key={cat.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
                    <form action={updateCategory} className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                      <input type="hidden" name="categoryId" value={cat.id} />
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={`name-${cat.id}`}
                          className="text-xs font-medium text-slate-600"
                        >
                          Nome
                        </label>
                        <input
                          id={`name-${cat.id}`}
                          name="name"
                          type="text"
                          required
                          defaultValue={cat.name}
                          className={`${fieldClass} mt-1`}
                        />
                      </div>
                      <div className="flex flex-wrap items-end gap-3 sm:gap-4">
                        <div className="shrink-0">
                          <label
                            htmlFor={`color-${cat.id}`}
                            className="text-xs font-medium text-slate-600"
                          >
                            Cor
                          </label>
                          <CategoryColorField id={`color-${cat.id}`} defaultHex={cat.color} />
                        </div>
                        <button
                          type="submit"
                          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                        >
                          Salvar
                        </button>
                      </div>
                    </form>
                    <form action={deleteCategory} className="flex shrink-0 items-center lg:pb-0.5">
                      <input type="hidden" name="categoryId" value={cat.id} />
                      <button
                        type="submit"
                        disabled={cat.itemCount > 0}
                        title={
                          cat.itemCount > 0
                            ? `Remova ou realoque os ${cat.itemCount} item(ns) antes de excluir.`
                            : "Excluir categoria"
                        }
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 lg:w-auto"
                      >
                        <Trash2 size={16} />
                        Excluir
                      </button>
                    </form>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {cat.itemCount === 0
                      ? "Nenhum item nesta categoria."
                      : `${cat.itemCount} item(ns) vinculado(s).`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
              Nenhuma categoria ainda. Crie a primeira acima.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
