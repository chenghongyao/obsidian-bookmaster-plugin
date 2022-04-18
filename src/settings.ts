
import { MAIN_BOOKVAULT_ID } from "./constants"; // FIXME: cant find BookStatus if move down 
import { BookTreeSortType } from "./Book";

export interface DeviceSetting {
	deviceName: string;
	bookVaultPaths: {[vid:string]:string};
    bookViewerWorkerPath: string;
}

export const DEFAULT_DEVICE_SETTINGS: DeviceSetting = {
	deviceName: "",
	bookVaultPaths: {[MAIN_BOOKVAULT_ID]:"D:\\paper"},
    bookViewerWorkerPath: "http://127.0.0.1:8863/bookviewer",
};


export interface BookMasterSettings {
    deviceSetting: {[appId:string]:DeviceSetting};
    dataPath: string;

    validBookExts: Array<string>;

    currentBookVault: string;
    bookVaultNames: {[vid:string]:string};

    bookTreeSortType: BookTreeSortType;
    bookTreeSortAsc: boolean;

    openAllBookWithDefaultApp: boolean;
    openBookExtsWithDefaultApp: Array<string>
}

export const DEFAULT_SETTINGS: BookMasterSettings = {
    deviceSetting: {},
    dataPath: "bookmaster",

	validBookExts: ["pdf",
    "xlsx","xls","doc","docx","ppt","pptx", // office
    "jpg","jpeg","png","bmp",               //image
    "epub",
    "txt",
    "html"],

    currentBookVault: MAIN_BOOKVAULT_ID,
    bookVaultNames: {[MAIN_BOOKVAULT_ID]:"我的书库"},

    bookTreeSortType: BookTreeSortType.PATH,
    bookTreeSortAsc: true,

    openAllBookWithDefaultApp: false,
    openBookExtsWithDefaultApp: [],
};