import { LuaTool } from "lua-cli";
import { searchCatalogItems } from "@/lib/catalog-search";
import { z } from "zod";

export class SearchCatalogItemsTool implements LuaTool {
  name = "search_catalog_items";
  description =
    "Search the ProcurePilot sourcing catalog and return the closest supported procurement items.";

  inputSchema = z.object({
    query: z.string().min(2),
    limit: z.number().int().min(1).max(5).optional(),
  });

  async execute(input: z.infer<typeof this.inputSchema>) {
    const parsed = this.inputSchema.parse(input);
    const matches = searchCatalogItems(parsed.query, parsed.limit ?? 3);

    return {
      query: parsed.query,
      matches,
    };
  }
}
