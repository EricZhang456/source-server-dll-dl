/** @import { GameManifest, DownloadResult } from "./manifest_typedef" */

import fs from "fs/promises";
import path from "path";
import SteamUser from "steam-user";

import { runWithConcurrencyLimit } from "./asynclimiter.js";

/**
 * Steam sign on options.
 * @typedef {object} SignOnOptions
 * @property {string} [refreshToken] Steam refresh token.
 * @property {SteamUser.EOSType} [osType] OS type.
 */

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
 * Enum for platforms.
 * @readonly
 * @enum {string}
 */
export const platforms = {
    LINUX: "linux",
    WINDOWS: "windows",
    LINUX64: "linux64",
    WINDOWS64: "windows64",
};

export default class DLLDownloader {
    #steamUser

    constructor() {
        this.#steamUser = new SteamUser();
    }

    /**
     * @param {string} event
     * @returns {Promise<void>}
     */
    #getPromiseFromEvent(event) {
        return new Promise(resolve => {
            const listener = () => {
                resolve();
            };
            this.#steamUser.on(event, listener);
        });
    }

    /**
     * Log onto Steam.
     * @param {SignOnOptions} [options={}] Log on options.
     */
    async logOn(options = {}) {
        const steamUserLogOnOptions = {
            anonymous: !Object.hasOwn("refreshToken"),
        };
        if (Object.hasOwn("refreshToken")) {
            steamUserLogOnOptions.refreshToken = options.refreshToken;
        }
        if (Object.hasOwn("osType")) {
            steamUserLogOnOptions.clientOS = options.osType;
        }
        this.#steamUser.logOn(steamUserLogOnOptions);
        await this.#getPromiseFromEvent("loggedOn");
    }

    /**
     * Log off of Steam.
     */
    async logOff() {
        this.#steamUser.logOff();
        await this.#getPromiseFromEvent("disconnected");
    }

    /**
     * Gets the last modified date for the dedicated server depot.
     * @param {GameManifest} manifest Game manifest.
     * @param {platforms} platform Platform for the DLL.
     * @param {string} [branchName="public"] Optional branch name.
     * @returns {Promise<Date>} Last modified date.
     */
    async getDepotUpdateDate(manifest, platform, branchName = "public") {
        if (!Object.values(platforms).includes(platform)) {
            throw new TypeError(`Invalid platform ${platform}`);
        }
        if (platform.endsWith("64")) {
            platform = platform.replace("64", "");
        }
        const dsAppId = manifest.ds_appid;
        const depots = (await this.#steamUser.getProductInfo([dsAppId], [], true)).apps[dsAppId].appinfo.depots;
        return new Date(depots.branches[branchName].timeupdated * 1000)
    }

    /**
     * Downloads a server DLL.
     * @param {GameManifest} manifest Game manifest.
     * @param {platforms} platform Platform for the downloaded file.
     * @param {string} [branchName="public"] Optional branch name to specify which branch to download from.
     * @param {string} manifestId Optional manifest ID.
     * @param {string} [path] Optional path to the target file location.
     * @returns {Promise<DownloadResult>} Download result.
     */
    async downloadDLL(manifest, platform, branchName = "public", manifestId, path) {
        if (!Object.values(platforms).includes(platform)) {
            throw new TypeError(`Invalid platform ${platform}`);
        }
        if (platform.endsWith("64") && !manifest.supports_64bit) {
            throw new TypeError("Requested 64-bit binary but game does not support it.");
        }
        const targetFile = manifest.server_dll_location[platform].replaceAll("/", "\\");
        const targetDepotId = manifest.dll_depot[platform.replace("64", "")];
        const dsAppId = manifest.ds_appid;

        const depots = (await this.#steamUser.getProductInfo([dsAppId], [], true)).apps[dsAppId].appinfo.depots;
        const branch = depots.branches[branchName];
        if (!manifestId) {
            manifestId = depots[targetDepotId].manifests[branchName].gid;
        }
        const depotUpdatedDate = new Date(branch.timeupdated * 1000);
    
        const depotManifest = await this.#steamUser.getManifest(dsAppId, targetDepotId, manifestId, branchName);
        const fileManifest = depotManifest.manifest.files.filter(obj => obj.filename === targetFile)[0];
        const downloadResult = await this.#steamUser.downloadFile(dsAppId, targetDepotId, fileManifest, path);
        
        const returnObj = {
            platform: platform,
            updatedDate: depotUpdatedDate,
            shaContent: fileManifest.sha_content,
        };

        if (!path) {
            returnObj.file = downloadResult.file;
        }

        return returnObj;
    }

    /**
     * Batch downloads all DLLs in an array of game manifests to a directory.
     * @param {GameManifest[]} manifests An array of game manifests.
     * @param {boolean} [organizeByDate=false] Whether to put the files in directories with the
     *                                         date in UNIX timestamp as the directory name.
     * @param {string} [targetDir] Optional path to directory to put the files.
     * @param {string} [branchName="public"] Optional branch name.
     * @returns {Promise<GameDownloadResult[]>}
     */

    async batchDownloadDlls(manifests, organizeByDate = false, targetDir, branchName = "public") {
        const tasks = manifests.map((obj) => async () => {
            const targetPlatforms = obj.supports_64bit ? Object.values(platforms)
                                                       : [platforms.WINDOWS, platforms.LINUX];
            const platformResults = await Promise.all(targetPlatforms.map(async (platform) => {
                const downloadResult = await this.downloadDLL(obj, platform, branchName);
                if (path) {
                    let dateDir = "";
                    if (organizeByDate) {
                        dateDir = ((await this.getDepotUpdateDate(obj, platform, branchName)).getTime() / 1000).toString();
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
        });

        // only run 2 at a time cuz steam doesn't like it when you dos their servers
        const downloads = await runWithConcurrencyLimit(tasks, manifests.length > 2 ? 2 : manifests.length);
        return downloads;
    }
}
