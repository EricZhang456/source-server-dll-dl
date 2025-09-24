/** @import { DownloadManifest } from "./manifest_typedef"  */

import fs from "fs/promises";
import path from 'path';
import { fileURLToPath } from 'url';
import downloadDLL from "./downloaddlls.js";

const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../");
const manifestDir = path.join(baseDir, "resources", "manifests");
const dllDownloadDir = path.join(baseDir, process.env.DLL_DOWNLOAD_LOCATION);

export default async function dllDownloadTask() {
    const manifestFiles = await fs.readdir(manifestDir);
    const manifestList = await Promise.all(manifestFiles.map(async (file) =>
        JSON.parse(await fs.readFile(path.join(manifestDir, file), "utf-8"))));
    const result = await downloadDLL(manifestList, false, dllDownloadDir);
    /** @type {DownloadManifest[]} */
    const downloadManifests = [];
    result.forEach(obj =>
        downloadManifests.push({
            game_id: obj.gameId,
            last_modified_date: obj.result[0].result.updatedDate,
        })
    );
    await fs.writeFile(path.join(dllDownloadDir, "manifest.json"), JSON.stringify(downloadManifests));
}

dllDownloadTask();
