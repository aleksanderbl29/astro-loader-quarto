export type AssetStrategy = "reference" | "copy" | "symlink";
export interface AssetConfig {
  /** Local assets are copied by default. symlink is unsupported. */
  strategy?: AssetStrategy;
  /** Namespace below Astro config.publicDir; defaults to quarto-assets. */
  publicDir?: string;
  imageResolver?: (imagePath: string, qmdPath: string) => string;
}
export type FieldMappings = Record<string, string>;
export const DEFAULT_FIELD_MAPPINGS: FieldMappings = {
  date: "pubDate",
  "date-modified": "updatedDate",
  "last-modified": "updatedDate",
  image: "heroImage",
};
export interface QuartoLoaderConfig {
  /** Relative to Astro config.root. */
  quartoRoot: string;
  outputDir?: string;
  pattern?: string | string[];
  listings?: string | string[];
  autoRender?:
    | boolean
    | { enabled: boolean; command?: string; args?: string[]; format?: string };
  fieldMappings?: FieldMappings;
  filter?: (entry: Record<string, unknown>) => boolean | Promise<boolean>;
  transform?: (
    entry: Record<string, unknown>,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  assets?: AssetConfig;
  /** Resolve source .qmd crosslinks to public site URLs. Otherwise they fail. */
  resolveLink?: (href: string, sourcePath: string) => string | Promise<string>;
  /** Retained compatibility hints; reconciliation always reads fresh inputs. */
  cache?: boolean;
  parallel?: boolean;
}
