/** @import { DownloadManifest, GameManifest } from "./manifest_typedef"  */

import fs from "fs/promises";
import path from 'path';
import { fileURLToPath } from 'url';
import DLLDownloader from "./dlldownloader.js";

const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../");
const manifestDir = path.join(baseDir, "resources", "manifests");

export default async function dllDownloadTask() {
    const dllDownloadDir = path.join(baseDir, process.env.DLL_DOWNLOAD_LOCATION);
    const downloadManifestPath = path.join(dllDownloadDir, "manifest.json");
    // TODO: Download log in required DLLs as well.
    const dllDownloader = new DLLDownloader();
    /** @type {DownloadManifest[]} */
    let downloadManifest = [];
    try {    
        downloadManifest = JSON.parse(await fs.readFile(downloadManifestPath, "utf-8"), (key, value) =>
            key === "last_modified_date" ? new Date(value) : value
        );
    } catch (error) {
        if (!error.code === "ENOENT") {
            throw error;
        }
    }
    const manifestFiles = await fs.readdir(manifestDir);
    /** @type {GameManifest[]} */
    const manifestList = await Promise.all(manifestFiles.map(async (file) =>
        JSON.parse(await fs.readFile(path.join(manifestDir, file), "utf-8"))));

    await dllDownloader.logOn();
    /** @type {GameManifest[]} */
    const gamesToDownload = [];
    const lastUpdatedDates = await Promise.all(manifestList.map(async (obj) => ({
        gameId: obj.id,
        // platform doesn't matter, i hope
        lastModifiedDate: await dllDownloader.getDepotUpdateDate(obj, "linux"),
    })));
    lastUpdatedDates.forEach((obj) => {
        const dlManifestObj = downloadManifest.find(e => e.game_id === obj.gameId);
        if (!dlManifestObj || (obj.lastModifiedDate > dlManifestObj.last_modified_date)) {
            gamesToDownload.push(manifestList.find(e => e.id === obj.gameId));
        }
    });

    const result = await dllDownloader.batchDownloadDlls(gamesToDownload, false, dllDownloadDir);
    result.forEach((obj) => {
        const dlManifestObj = downloadManifest.find(e => e.game_id === obj.gameId);
        const dlResultObj = {
            game_id: obj.gameId,
            last_modified_date: obj.result[0].result.updatedDate,
        };
        if (!dlManifestObj) {
            downloadManifest.push(dlResultObj);
        } else {
            downloadManifest[downloadManifest.findIndex(e => e.game_id === obj.gameId)] = dlResultObj;
        }
    });
    await fs.writeFile(downloadManifestPath, JSON.stringify(downloadManifest));
    await dllDownloader.logOff(); 
}
