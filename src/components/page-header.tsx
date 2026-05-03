import type { ReactNode } from "react";

/** Faixa completa: fundo branco + borda inferior (uso interno e layouts especiais). */
export const pageHeaderSectionClass =
  "border-b border-petroleum-900/10 bg-white";

/**
 * Conteúdo do cabeçalho e secções principais alinhadas à mesma largura (`max-w-7xl`).
 */
export const pageHeaderInnerClass =
  "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8";

/** Alias: mesmo grid horizontal para o corpo abaixo do header. */
export const pageMainInnerClass = pageHeaderInnerClass;

type PageHeaderProps = {
  children: ReactNode;
  /** Classes extra na `<section>` (ex.: sticky). */
  className?: string;
  /** Classes extra no container interno (ex.: flex, gaps). */
  innerClassName?: string;
};

export function PageHeader({ children, className = "", innerClassName = "" }: PageHeaderProps) {
  return (
    <section className={[pageHeaderSectionClass, className].filter(Boolean).join(" ")}>
      <div className={[pageHeaderInnerClass, innerClassName].filter(Boolean).join(" ")}>
        {children}
      </div>
    </section>
  );
}
