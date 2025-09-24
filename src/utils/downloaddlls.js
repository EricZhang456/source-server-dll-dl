/** @import { GameManifest, DownloadResult } from "./manifest_typedef.js" */
import fs from "fs/promises";
import path from "path";
import DLLDownloader, { platforms } from "./dlldownloader.js";

/**
 * @typedef {object} PlatformDownloadResult
 * @property {string} platform
 * @property {DownloadResult} result
 */

/**
 * @typedef {object} GameDownloadResult
 * @property {string} gameId
 * @property {PlatformDownloadResult[]} result
 */

/**
 * Downloads all DLLs in an array of game manifests.
 * @param {GameManifest[]} manifests An array of game manifests.
 * @param {boolean} [organizeByDate=false] Whether to put the files in directories with the date.
 * @param {string} [targetDir] Optional path to directory to put the files.
 * @param {string} [branchName="public"] Optional branch name.
 * @returns {Promise<GameDownloadResult[]>}
 */
export default async function downloadDLL(manifests, organizeByDate = false, targetDir, branchName = "public") {
    const dllDownloader = new DLLDownloader();
    await dllDownloader.logOn();
    const anonManifests = manifests.filter(obj => !obj.login);
    const downloads = await Promise.all(anonManifests.map(async (obj) => {
        const targetPlatforms = obj.supports_64bit ? Object.values(platforms)
                                                   : [platforms.WINDOWS, platforms.LINUX];
        const platformResults = await Promise.all(targetPlatforms.map(async (platform) => {
            const downloadResult = await dllDownloader.downloadDLL(obj, platform, branchName);
            if (path) {
                let dateDir = "";
                if (organizeByDate) {
                    dateDir = ((await dllDownloader.getDepotUpdateDate(obj, platform, branchName)).getTime() / 1000).toString();
                }
                const dllTargetDir = path.join(targetDir, obj.id, dateDir, platform);
                await fs.mkdir(dllTargetDir, { recursive: true });
                await fs.writeFile(path.join(dllTargetDir, obj.server_dll_name[platform.replace("64", "")]),
                    downloadResult.file);
                delete downloadResult.file;
            }
            return {
                platform: platform,
                result: downloadResult,
            }
        }));
        return {
            gameId: obj.id,
            result: platformResults,
        };
    }));
    // TODO: Downloads for sign-in required depots
    await dllDownloader.logOff();
    return downloads;
}
