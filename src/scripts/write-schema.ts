import { writeFileSync, mkdirSync } from "node:fs";
import { fetchSpecJsonSchema } from "../lib/fetch-spec";

mkdirSync("docs", { recursive: true });
writeFileSync("docs/schema.json", JSON.stringify(fetchSpecJsonSchema(), null, 2) + "\n");
