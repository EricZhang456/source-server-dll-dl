// JSON

/**
 * DLL Depot number.
 */
interface DLLDepot {
    windows: number;
    linux: number;
}

/**
 * Server DLL location.
 */
interface ServerDLLLocation {
    windows: string;
    linux: string;
    windows64?: string;
    linux64?: string;
}

/**
 * Name of the server DLL.
 */
interface ServerDLLName {
    windows: string;
    linux: string;
}

/**
 * Game server DLL manifest.
 */
export interface GameManifest {
    id: string,
    name: string;
    appid: number;
    ds_appid: number;
    login: boolean;
    supports_64bit: boolean;
    dll_depot: DLLDepot;
    server_dll_location: ServerDLLLocation;
    server_dll_name: ServerDLLName;
}

/**
 * Download Manifest.
 */
export interface DownloadManifest {
    game_id: string;
    last_modified_date: Date;
}

// JS Object

/**
 * Download result.
 */
export interface DownloadResult {
    platform: platforms;
    updatedDate: Date;
    shaContent: string;
    file?: Buffer;
}
