/**
 * Main Astro Loader implementation for Quarto content
 */

import { resolve, join, relative } from "path";
import type { Loader } from "astro/loaders";
import type { QuartoLoaderConfig } from "./types/loader-config.js";
import { mergeFieldMappings } from "./parsers/metadata-normalizer.js";
import {
  parseQuartoYaml,
  extractListings,
  getOutputDir,
  findListing,
  validateQuartoFormat,
} from "./parsers/quarto-yaml.js";
import {
  resolveListing,
  applySortConfiguration,
} from "./parsers/listing-config.js";
import { parseQmdFile, extractMetadata } from "./parsers/qmd-frontmatter.js";
import { normalizeMetadata } from "./parsers/metadata-normalizer.js";
import {
  readRenderedMarkdown,
  matchQmdToMd,
} from "./parsers/markdown-content.js";
import { createListingSchema } from "./schema/generator.js";
import { validateEntryOrThrow } from "./schema/validator.js";
import { FileCache } from "./utils/cache.js";
import { createFileWatcher } from "./utils/file-watcher.js";
import { createLogger, Timer } from "./utils/logger.js";
import {
  renderQuarto,
  normalizeAutoRenderConfig,
} from "./utils/quarto-renderer.js";
import { ListingNotFoundError } from "./utils/errors.js";

/**
 * Create a Quarto content loader for Astro
 */
export function quartoLoader(config: QuartoLoaderConfig): Loader {
  // Normalize configuration
  const quartoRoot = resolve(config.quartoRoot);
  const fieldMappings = mergeFieldMappings(config.fieldMappings);
  const cacheEnabled = config.cache ?? true;
  const parallelEnabled = config.parallel ?? true;

  // Create cache instances
  const qmdCache = new FileCache<ReturnType<typeof extractMetadata>>(
    cacheEnabled ? 500 : 0,
  );
  const fileWatcher = createFileWatcher();

  return {
    name: "quarto-loader",

    load: async ({ store, logger: astroLogger, meta }) => {
      const logger = createLogger(astroLogger);
      const timer = new Timer();

      try {
        logger.info("Loading Quarto content...");

        // 0. Optional: Auto-render Quarto content
        const renderOptions = normalizeAutoRenderConfig(config.autoRender);
        if (renderOptions.enabled) {
          logger.info("Auto-rendering Quarto content...");
          try {
            await renderQuarto(quartoRoot, renderOptions);
            logger.info("Quarto rendering complete");
          } catch (error) {
            logger.error(`Auto-render failed: ${(error as Error).message}`);
            throw error;
          }
        }

        // 1. Parse _quarto.yml
        const quartoYamlPath = join(quartoRoot, "_quarto.yml");
        logger.debug(`Parsing Quarto config: ${quartoYamlPath}`);
        const quartoConfig = await parseQuartoYaml(quartoYamlPath);

        // Validate GFM format
        validateQuartoFormat(quartoConfig, logger);

        // 2. Get output directory
        const outputDir = config.outputDir || getOutputDir(quartoConfig);
        const outputPath = resolve(quartoRoot, outputDir);

        // 3. Resolve which listings to load
        const allListings = extractListings(quartoConfig);
        logger.debug(`Found ${allListings.length} listing(s) in Quarto config`);

        let listingsToLoad = allListings;

        if (config.listings) {
          if (config.listings === "all") {
            // Load all listings
            listingsToLoad = allListings;
          } else if (typeof config.listings === "string") {
            // Load single listing
            const listing = findListing(quartoConfig, config.listings);
            if (!listing) {
              throw new ListingNotFoundError(
                config.listings,
                allListings.map((l) => l.id),
              );
            }
            listingsToLoad = [listing];
          } else {
            // Load multiple specific listings
            listingsToLoad = [];
            for (const listingId of config.listings) {
              const listing = findListing(quartoConfig, listingId);
              if (!listing) {
                throw new ListingNotFoundError(
                  listingId,
                  allListings.map((l) => l.id),
                );
              }
              listingsToLoad.push(listing);
            }
          }
        }

        logger.info(
          `Loading ${listingsToLoad.length} listing(s): ${listingsToLoad.map((l) => l.id).join(", ")}`,
        );

        // 4. Process each listing
        let totalEntries = 0;

        for (const listing of listingsToLoad) {
          const listingTimer = new Timer();
          logger.debug(`Processing listing: ${listing.id}`);

          // 5. Resolve listing files
          const resolved = await resolveListing(listing, quartoRoot);
          logger.debug(
            `Found ${resolved.files.length} file(s) for listing ${listing.id}`,
          );

          if (resolved.files.length === 0) {
            logger.warn(`No files found for listing ${listing.id}`);
            continue;
          }

          // 6. Parse .qmd files (in parallel if enabled)
          const parseFile = async (filePath: string) => {
            // Check cache first
            if (cacheEnabled) {
              const cached = await qmdCache.get(filePath);
              if (cached) {
                return { filePath, metadata: cached };
              }
            }

            const qmdDoc = await parseQmdFile(filePath);
            const metadata = extractMetadata(qmdDoc.frontmatter);

            // Cache result
            if (cacheEnabled) {
              await qmdCache.set(filePath, metadata);
            }

            return { filePath, metadata };
          };

          const parsedFiles = parallelEnabled
            ? await Promise.all(resolved.files.map(parseFile))
            : await resolved.files.reduce(
                async (acc, file) => {
                  const results = await acc;
                  results.push(await parseFile(file));
                  return results;
                },
                Promise.resolve(
                  [] as Array<{
                    filePath: string;
                    metadata: ReturnType<typeof extractMetadata>;
                  }>,
                ),
              );

          logger.debug(
            `Parsed ${parsedFiles.length} file(s) for listing ${listing.id}`,
          );

          // 7. Normalize metadata and apply field mappings
          // Track file paths for later markdown content reading
          const filePathMap = new Map<string, string>();

          const normalizedEntries = parsedFiles.map(
            ({ filePath, metadata }) => {
              const entry = normalizeMetadata(
                metadata,
                filePath,
                {
                  basePath: quartoRoot,
                  outputDir: outputPath,
                  fieldMappings,
                  slugify: undefined, // Could be configurable
                  imageResolver: config.assets?.imageResolver,
                },
                resolved.defaults,
              );
              // Store file path mapping for this entry
              filePathMap.set(entry.id, filePath);
              return entry;
            },
          );

          logger.debug(
            `Normalized ${normalizedEntries.length} entry(s) for listing ${listing.id}`,
          );

          // 8. Apply filter function if provided
          let filteredEntries = normalizedEntries;
          if (config.filter) {
            if (parallelEnabled) {
              const filterResults = await Promise.all(
                normalizedEntries.map(async (entry) => ({
                  entry,
                  keep: await config.filter!(entry.data),
                })),
              );
              filteredEntries = filterResults
                .filter((r) => r.keep)
                .map((r) => r.entry);
            } else {
              const kept = [];
              for (const entry of normalizedEntries) {
                if (await config.filter(entry.data)) {
                  kept.push(entry);
                }
              }
              filteredEntries = kept;
            }

            logger.debug(
              `Filtered to ${filteredEntries.length} entry(s) for listing ${listing.id}`,
            );
          }

          // 9. Apply transform function if provided
          let transformedEntries = filteredEntries;
          if (config.transform) {
            if (parallelEnabled) {
              transformedEntries = await Promise.all(
                filteredEntries.map(async (entry) => ({
                  ...entry,
                  data: await config.transform!(entry.data),
                })),
              );
            } else {
              const transformed = [];
              for (const entry of filteredEntries) {
                transformed.push({
                  ...entry,
                  data: await config.transform(entry.data),
                });
              }
              transformedEntries = transformed;
            }

            logger.debug(
              `Transformed ${transformedEntries.length} entry(s) for listing ${listing.id}`,
            );
          }

          // 10. Apply sort configuration
          const sortedEntries = applySortConfiguration(
            transformedEntries,
            listing.sort,
          );

          // 11. Generate schema
          const entryDataList = sortedEntries.map(
            (e) => e.data as Record<string, unknown>,
          );
          const schema = createListingSchema(
            listing,
            entryDataList,
            config.schema,
            logger,
          );

          // 12. Read markdown content and validate entries
          for (const entry of sortedEntries) {
            try {
              // Get the original file path from our tracking map
              const filePath = filePathMap.get(entry.id);

              // Read rendered markdown content
              let body = "";
              if (filePath) {
                const mdPath = matchQmdToMd(filePath, quartoRoot, outputPath);
                try {
                  body = await readRenderedMarkdown(mdPath);
                } catch (error) {
                  logger.warn(
                    `Could not read markdown content for ${entry.id}: ${(error as Error).message}`,
                  );
                  // Continue with empty body
                }
              }

              // Validate metadata
              const validatedData = validateEntryOrThrow(
                entry.data as Record<string, unknown>,
                schema,
              );

              // Store entry with body field
              // For deferred rendering, we need a filePath that Astro can import
              // Since we have markdown in the outputPath already, use that
              const absoluteMdPath = filePath
                ? matchQmdToMd(filePath, quartoRoot, outputPath)
                : undefined;

              // Convert to relative path from project root (Astro requires relative paths)
              const mdPath = absoluteMdPath
                ? relative(process.cwd(), absoluteMdPath)
                : undefined;

              // Log the paths for debugging
              logger.debug(
                `Entry ${entry.id}: mdPath=${mdPath}, hasBody=${!!body}`,
              );

              // Register the markdown file as a module import for Vite
              if (mdPath) {
                store.addModuleImport(mdPath);
              }

              store.set({
                id: entry.id,
                data: validatedData as Record<string, unknown>,
                body, // Markdown content
                filePath: mdPath, // Relative path to the .md file for deferred rendering
                deferredRender: true, // Enable markdown rendering via render()
              });

              totalEntries++;
            } catch (error) {
              logger.error(
                `Failed to process ${entry.id}: ${(error as Error).message}`,
              );
              // Continue processing other entries
            }
          }

          listingTimer.log(logger, `Processed listing ${listing.id}`);
        }

        // 13. Set up file watching in development
        if ((meta as { mode?: string }).mode === "dev") {
          if (!fileWatcher.isWatching()) {
            fileWatcher.watch([quartoRoot]);

            fileWatcher.on("change", (event) => {
              if (
                event.path.endsWith(".qmd") ||
                event.path.endsWith("_quarto.yml")
              ) {
                logger.debug(`File changed: ${event.path}`);
                qmdCache.invalidate(event.path);
              }
            });

            logger.debug("File watching enabled for hot reload");
          }
        }

        timer.log(logger, `Loaded ${totalEntries} total entry(s) from Quarto`);
      } catch (error) {
        logger.error(
          `Failed to load Quarto content: ${(error as Error).message}`,
        );
        throw error;
      }
    },

    schema: async () => {
      // Return a basic schema - actual schema is generated per listing in load()
      // This is used by Astro for type generation
      const { baseSchema } = await import("./schema/common-fields.js");
      return baseSchema;
    },
  };
}
