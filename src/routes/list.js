/** /list view */

import fs from "fs";
import { Router } from "express";

const router = Router();

router.get("/", (req, res, next) => {
    res.render("list");
});

export default router;
