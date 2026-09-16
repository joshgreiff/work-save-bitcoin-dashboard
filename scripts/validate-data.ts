import { validateAllDataFiles } from "../src/lib/data/load";

try {
  validateAllDataFiles();
  console.log("All data files validated successfully.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
