/** /dl view */

/** @import { GameManifest } from "../utils/manifest_typedef.d.ts" */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Router } from "express";

const router = Router();
const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../");
const manifestDir = path.join(baseDir, "resources", "manifests");

router.get("/:gameId/:platform/:filename", async (req, res) => {
    if (req.path.endsWith("/")) {
        res.status(404).send();
        return;
    }
    const gameId = req.params.gameId;
    const platform = req.params.platform;
    const filename = req.params.filename;
    const dllDir = req.app.locals.dllDownloadDir;
    let gameManifestFile = "";
    try {
        gameManifestFile = await fs.readFile(path.join(manifestDir, `${gameId}.json`), "utf-8");
    } catch (e) {
        if (e.code === "ENOENT") {
            res.status(404).send({
                error: "Game does not exist.",
            });
            return;
        }
    }
    /** @type {GameManifest} */
    const gameManifest = JSON.parse(gameManifestFile);
    if (platform.endsWith("64") && !gameManifest.supports_64bit) {
        res.status(404).send({
            error: "Game does not support 64-bit."
        });
        return;
    }
    if (filename !== gameManifest.server_dll_name[platform.replace("64", "")]) {
        res.status(404).send({
            error: "Incorrect filename."
        });
        return;
    }
    res.sendFile(path.join(dllDir, gameId, platform, filename));
});

export default router;
