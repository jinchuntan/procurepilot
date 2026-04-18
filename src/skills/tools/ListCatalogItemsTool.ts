import { LuaTool } from "lua-cli";
import { catalogItems } from "@/lib/data";
import { z } from "zod";

export class ListCatalogItemsTool implements LuaTool {
  name = "list_catalog_items";
  description = "List supported procurement catalog items and categories in ProcurePilot.";

  inputSchema = z.object({
    category: z
      .enum([
        "maintenance",
        "office supplies",
        "packaging",
        "chemicals",
        "spare parts",
        "electronics",
        "safety equipment",
      ])
      .optional(),
    limit: z.number().int().min(1).max(15).optional(),
  });

  async execute(input: z.infer<typeof this.inputSchema>) {
    const parsed = this.inputSchema.parse(input);
    const items = catalogItems
      .filter((item) => (parsed.category ? item.category === parsed.category : true))
      .slice(0, parsed.limit ?? 12)
      .map((item) => ({
        itemId: item.id,
        name: item.name,
        shortLabel: item.shortLabel,
        category: item.category,
        unit: item.unit,
      }));

    return {
      items,
      total: items.length,
    };
  }
}
