import { LuaTool } from "lua-cli";
import { getItemById, getSupplierById } from "@/lib/data";
import { z } from "zod";

export class GetCatalogItemDetailsTool implements LuaTool {
  name = "get_catalog_item_details";
  description =
    "Return detailed specs, substitute items, and supplier coverage for one supported catalog item.";

  inputSchema = z.object({
    itemId: z.string().min(1),
  });

  async execute(input: z.infer<typeof this.inputSchema>) {
    const parsed = this.inputSchema.parse(input);
    const item = getItemById(parsed.itemId);

    if (!item) {
      throw new Error(`Unsupported itemId "${parsed.itemId}"`);
    }

    return {
      item,
      substitutes: item.substituteIds,
      supportedSuppliers: item.supplierIds.map((supplierId) => {
        const supplier = getSupplierById(supplierId);

        return supplier
          ? {
              supplierId: supplier.id,
              supplierName: supplier.name,
              country: supplier.country,
              region: supplier.region,
            }
          : null;
      }).filter(Boolean),
    };
  }
}
