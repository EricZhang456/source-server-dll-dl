/** @import { Router } from "express" */
import { default as indexRouter } from "./index.js";
import { default as listRouter } from "./list.js";
import { default as dlRouter } from "./dl.js";

/** @type {Map<Router, string>} */
const routes = new Map();

routes.set(indexRouter, "/");
routes.set(listRouter, "/list");
routes.set(dlRouter, "/dl");

export default routes;
