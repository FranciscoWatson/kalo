import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./resolver-ts.mjs", pathToFileURL(import.meta.filename));
