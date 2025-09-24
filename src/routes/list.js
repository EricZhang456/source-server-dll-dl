/** /list view */

/** @import { DownloadManifest, GameManifest } from "../utils/manifest_typedef.d.ts" */
import fs from "fs/promises";
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from "express";

/**
 * @typedef {object} DLContext
 * @property {GameManifest} game
 * @property {DownloadManifest} dl
 */

const router = Router();
const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../");
const manifestDir = path.join(baseDir, "resources", "manifests");

router.get("/", async (req, res) => {
    /** @type {DLContext[]} */
    const resContext = [];
    /** @type {DownloadManifest[]} */
    const dlManifest = JSON.parse(await fs.readFile(path.join(req.app.locals.dllDownloadDir, "manifest.json"), "utf-8"), (key, value) =>
        key === "last_modified_date" ? new Date(value) : value
    );
    /** @type {GameManifest[]} */
    const gameManifests = await Promise.all(dlManifest.map(async (obj) =>
        JSON.parse(await fs.readFile(path.join(manifestDir, `${obj.game_id}.json`), "utf-8"))
    ));
    dlManifest.forEach((obj) =>
        resContext.push({
            game: gameManifests.find(e => e.id === obj.game_id),
            dl: obj,
        })
    );
    res.render("list", { manifests: resContext });
});

export default router;
