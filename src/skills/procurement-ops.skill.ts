import { LuaSkill } from "lua-cli";
import { CompareUrgencyImpactTool } from "./tools/CompareUrgencyImpactTool.js";
import { GetCatalogItemDetailsTool } from "./tools/GetCatalogItemDetailsTool.js";
import { ListCatalogItemsTool } from "./tools/ListCatalogItemsTool.js";
import { PrepareProcurementRequestTool } from "./tools/PrepareProcurementRequestTool.js";
import { RunProcurementAssessmentTool } from "./tools/RunProcurementAssessmentTool.js";
import { SearchCatalogItemsTool } from "./tools/SearchCatalogItemsTool.js";
import { SimulateSupplierNegotiationTool } from "./tools/SimulateSupplierNegotiationTool.js";
import { SystemHealthCheckTool } from "./tools/SystemHealthCheckTool.js";
import { ValidateProcurementRequestTool } from "./tools/ValidateProcurementRequestTool.js";

export const procurementSkill = new LuaSkill({
  name: "procurement-ops-skill",
  description: "Crisis-aware procurement ranking and recommendation tools for SMEs.",
  context:
    "Use these tools to search the supported catalog, prepare a normalized procurement request, validate it, and then run the assessment. For natural-language sourcing briefs, resolve the closest item first, build the request with sensible assumptions only when needed, explain the recommendation in plain business language, and use the supplier negotiation tool after the user selects a preferred option.",
  tools: [
    new SearchCatalogItemsTool(),
    new ListCatalogItemsTool(),
    new GetCatalogItemDetailsTool(),
    new PrepareProcurementRequestTool(),
    new ValidateProcurementRequestTool(),
    new RunProcurementAssessmentTool(),
    new CompareUrgencyImpactTool(),
    new SimulateSupplierNegotiationTool(),
    new SystemHealthCheckTool(),
  ],
});

export default procurementSkill;
