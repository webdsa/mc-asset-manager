/**
 * Perfis de importação RefTab por categoria.
 */

export type FieldMapRow = {
  assetManager: string;
  reftab: string;
  notes: string;
};

export type ReftabCategoryProfile = {
  id: string;
  reftabCid: number;
  reftabCategoryName: string;
  /** Nome da Category no Asset Manager */
  targetCategoryName: string;
  /** Chaves em details já mapeadas a colunas do Item */
  detailKeysInColumns: readonly string[];
  /** Campo details → Item.model */
  modelDetailKey: string;
  /** Campos details que vão só para description (além dos não listados em columns) */
  descriptionDetailKeys: readonly string[];
  /** Campo details usado como ano de compra (ex.: "Ano" em câmeras) */
  purchaseYearDetailKey?: string;
  fieldMap: FieldMapRow[];
};

const SHARED_TAIL: FieldMapRow[] = [
  {
    assetManager: "categoryId",
    reftab: "catName / cid",
    notes: "Categoria no AM (REFTAB_IMPORT_TARGET_CATEGORY)",
  },
  {
    assetManager: "location",
    reftab: "locationName",
    notes: "",
  },
  {
    assetManager: "purchaseYear",
    reftab: 'details["Data da compra"] ou created',
    notes: "",
  },
  {
    assetManager: "purchaseDate",
    reftab: 'details["Data da compra"]',
    notes: "",
  },
  {
    assetManager: "purchaseValue",
    reftab: 'details["Valor da compra"]',
    notes: "Inteiro em centavos no RefTab → divide por 100",
  },
  {
    assetManager: "warrantyExpires",
    reftab: 'details["Validade da garantia"]',
    notes: "",
  },
  {
    assetManager: "notes",
    reftab: "notes + Link nota fiscal + metadados RefTab",
    notes: "",
  },
  {
    assetManager: "quantity",
    reftab: "(fixo)",
    notes: "1",
  },
  {
    assetManager: "images[].url",
    reftab: "image.full ou imageLink",
    notes: "",
  },
  {
    assetManager: "condition",
    reftab: "(fixo)",
    notes: "GOOD",
  },
  {
    assetManager: "insuranceStatus",
    reftab: "(fixo)",
    notes: "NOT_INSURED",
  },
];

const SHARED_HEAD: FieldMapRow[] = [
  { assetManager: "name", reftab: "title", notes: "Obrigatório" },
  {
    assetManager: "qrCode",
    reftab: "aid",
    notes: "Duplicado → ignora",
  },
  { assetManager: "brand", reftab: 'details["Marca"]', notes: "" },
];

export const REFTAB_PROFILE_LENTE: ReftabCategoryProfile = {
  id: "lente",
  reftabCid: 88464,
  reftabCategoryName: "Lente",
  targetCategoryName: "Lente",
  detailKeysInColumns: [
    "Marca",
    "Número de série",
    "Distância focal",
    "Data da compra",
    "Valor da compra",
    "Validade da garantia",
    "Foto Equipamento",
    "Link nota fiscal",
  ],
  modelDetailKey: "Distância focal",
  descriptionDetailKeys: ["Abertura focal", "Diâmetro da Lente ø", "Tipo de encaixe"],
  fieldMap: [
    ...SHARED_HEAD,
    {
      assetManager: "model",
      reftab: 'details["Distância focal"]',
      notes: "Spec principal da lente",
    },
    {
      assetManager: "serialNumber",
      reftab: 'details["Número de série"]',
      notes: "",
    },
    {
      assetManager: "description",
      reftab: "Abertura focal, Diâmetro, Tipo de encaixe + catName",
      notes: "",
    },
    ...SHARED_TAIL.map((row) =>
      row.assetManager === "categoryId"
        ? { ...row, notes: 'Gravado em "Lente"' }
        : row,
    ),
  ],
};

export const REFTAB_PROFILE_AUDIO: ReftabCategoryProfile = {
  id: "audio",
  reftabCid: 88519,
  reftabCategoryName: "Audio",
  targetCategoryName: "Áudio",
  detailKeysInColumns: [
    "Marca",
    "Modelo",
    "Número de série",
    "Data da compra",
    "Valor da compra",
    "Validade da garantia",
    "Foto Equipamento",
    "Link nota fiscal",
  ],
  modelDetailKey: "Modelo",
  descriptionDetailKeys: ["Frequência"],
  fieldMap: [
    ...SHARED_HEAD,
    {
      assetManager: "model",
      reftab: 'details["Modelo"]',
      notes: "Modelo do equipamento",
    },
    {
      assetManager: "serialNumber",
      reftab: 'details["Número de série"]',
      notes: "",
    },
    {
      assetManager: "description",
      reftab: 'details["Frequência"] + catName',
      notes: "",
    },
    ...SHARED_TAIL.map((row) =>
      row.assetManager === "categoryId"
        ? { ...row, notes: 'Gravado em "Áudio" (seed)' }
        : row,
    ),
  ],
};

export const REFTAB_PROFILE_CAMERA: ReftabCategoryProfile = {
  id: "camera",
  reftabCid: 88465,
  reftabCategoryName: "Camera",
  targetCategoryName: "Câmera",
  detailKeysInColumns: [
    "Marca",
    "Modelo",
    "Ano",
    "Número de série",
    "Data da compra",
    "Valor da compra",
    "Validade da garantia",
    "Foto Equipamento",
    "Link nota fiscal",
  ],
  modelDetailKey: "Modelo",
  purchaseYearDetailKey: "Ano",
  descriptionDetailKeys: ["Tipo de encaixe"],
  fieldMap: [
    ...SHARED_HEAD,
    {
      assetManager: "model",
      reftab: 'details["Modelo"]',
      notes: "Modelo da câmera",
    },
    {
      assetManager: "serialNumber",
      reftab: 'details["Número de série"]',
      notes: "",
    },
    {
      assetManager: "description",
      reftab: 'details["Tipo de encaixe"] + catName',
      notes: "Montura / encaixe",
    },
    ...SHARED_TAIL.map((row) => {
      if (row.assetManager === "categoryId") {
        return { ...row, notes: 'Gravado em "Câmera"' };
      }
      if (row.assetManager === "purchaseYear") {
        return {
          ...row,
          reftab: 'details["Ano"] ou Data da compra ou created',
          notes: "Ano do equipamento quando preenchido no RefTab",
        };
      }
      return row;
    }),
  ],
};

export const REFTAB_PROFILE_LUZ: ReftabCategoryProfile = {
  id: "luz",
  reftabCid: 88520,
  reftabCategoryName: "Luz para estúdio",
  targetCategoryName: "Luz",
  detailKeysInColumns: [
    "Marca",
    "Modelo",
    "Número de série",
    "Tipo",
    "Potencia",
    "Data da compra",
    "Valor da compra",
    "Validade da garantia",
    "Foto Equipamento",
    "Link nota fiscal",
  ],
  modelDetailKey: "Modelo",
  descriptionDetailKeys: ["Tipo", "Potencia"],
  fieldMap: [
    ...SHARED_HEAD,
    {
      assetManager: "model",
      reftab: 'details["Modelo"]',
      notes: "Modelo do equipamento",
    },
    {
      assetManager: "serialNumber",
      reftab: 'details["Número de série"]',
      notes: "",
    },
    {
      assetManager: "description",
      reftab: 'details["Tipo"], ["Potencia"] + catName',
      notes: "Tipo (ex. LED) e potência",
    },
    ...SHARED_TAIL.map((row) =>
      row.assetManager === "categoryId"
        ? { ...row, notes: 'Gravado em "Luz" (REFTAB_IMPORT_TARGET_CATEGORY)' }
        : row,
    ),
  ],
};

export const REFTAB_PROFILE_VIDEO: ReftabCategoryProfile = {
  id: "video",
  reftabCid: 90159,
  reftabCategoryName: "Video / Transmissão",
  targetCategoryName: "Vídeo",
  detailKeysInColumns: [
    "Marca",
    "Modelo",
    "Ano",
    "Número de série",
    "Valor da compra",
    "Validade da garantia",
    "Foto Equipamento",
    "Link nota fiscal",
  ],
  modelDetailKey: "Modelo",
  purchaseYearDetailKey: "Ano",
  descriptionDetailKeys: [],
  fieldMap: [
    ...SHARED_HEAD,
    {
      assetManager: "model",
      reftab: 'details["Modelo"]',
      notes: "Modelo do equipamento",
    },
    {
      assetManager: "serialNumber",
      reftab: 'details["Número de série"]',
      notes: "",
    },
    {
      assetManager: "description",
      reftab: "catName",
      notes: "Sem campos extra nesta categoria; só contexto RefTab",
    },
    ...SHARED_TAIL.map((row) => {
      if (row.assetManager === "categoryId") {
        return {
          ...row,
          notes: 'Gravado em "Vídeo" (REFTAB_IMPORT_TARGET_CATEGORY)',
        };
      }
      if (row.assetManager === "purchaseYear") {
        return {
          ...row,
          reftab: 'details["Ano"] ou created',
          notes: "Sem Data da compra no RefTab desta categoria",
        };
      }
      if (row.assetManager === "purchaseDate") {
        return {
          ...row,
          reftab: "(não disponível)",
          notes: "Campo Data da compra ausente no RefTab",
        };
      }
      return row;
    }),
  ],
};

export const REFTAB_PROFILES: Record<string, ReftabCategoryProfile> = {
  lente: REFTAB_PROFILE_LENTE,
  audio: REFTAB_PROFILE_AUDIO,
  camera: REFTAB_PROFILE_CAMERA,
  luz: REFTAB_PROFILE_LUZ,
  video: REFTAB_PROFILE_VIDEO,
};

export function resolveProfile(profileArg?: string): ReftabCategoryProfile {
  const key = (
    profileArg ??
    process.env.REFTAB_IMPORT_PROFILE?.trim() ??
    "lente"
  ).toLowerCase();
  const profile = REFTAB_PROFILES[key];
  if (!profile) {
    throw new Error(
      `Perfil desconhecido "${key}". Use: ${Object.keys(REFTAB_PROFILES).join(", ")}`,
    );
  }
  return profile;
}
