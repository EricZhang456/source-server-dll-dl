/** @import { Router } from "express" */
import { default as indexRouter } from "./index.js";
import { default as listRouter } from "./list.js";

/** @type {Map<Router, string>} */
const routes = new Map();

routes.set(indexRouter, "/");
routes.set(listRouter, "/list");

export default routes;
