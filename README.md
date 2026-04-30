# Asset Manager

Aplicação Next.js para gestão de itens de um estúdio: equipamentos, decoração, mobiliário, arquivos de nota fiscal, imagens, seguro, garantia e observações operacionais.

## Stack

- Next.js 16 com App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma 7

## Primeiros passos

Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

Suba o banco com Docker:

```bash
docker compose up -d postgres
```

Aplique o schema e cadastre as categorias iniciais:

```bash
npm run db:push
npm run db:seed
```

Inicie a aplicação:

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Scripts úteis

- `npm run dev`: servidor local
- `npm run build`: build de produção
- `npm run lint`: verificação ESLint
- `npm run db:generate`: gera o Prisma Client
- `npm run db:push`: sincroniza o schema no PostgreSQL
- `npm run db:seed`: cria categorias iniciais
- `npm run db:studio`: abre o Prisma Studio

## Uploads

Em desenvolvimento, imagens e notas fiscais são gravadas em `public/uploads`. O modelo já guarda URL e nome do arquivo, então a troca futura para S3, Cloudinary ou storage privado fica concentrada na action de cadastro.
