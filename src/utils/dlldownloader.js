/** @import { GameManifest, DownloadResult } from "./manifest_typedef" */

import SteamUser from "steam-user";

/**
 * Steam sign on options.
 * @typedef {object} SignOnOptions
 * @property {string} [refreshToken] Steam refresh token.
 * @property {SteamUser.EOSType} [osType] OS type.
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
}
