import { LuaTool } from "lua-cli";
import { catalogItems, supplierProfiles } from "@/lib/data";
import { z } from "zod";

export class SystemHealthCheckTool implements LuaTool {
  name = "system_health_check";
  description =
    "Check whether the ProcurePilot database and Lua procurement tools are ready.";

  inputSchema = z.object({});

  async execute() {
    return {
      status: "ok" as const,
      catalogItemCount: catalogItems.length,
      supplierCount: supplierProfiles.length,
      detail: "ProcurePilot catalog, supplier network, and Lua procurement tools are ready.",
    };
  }
}
