
import { MAIN_BOOKVAULT_ID } from "./constants"; // FIXME: cant find BookStatus if move down 
import { BookTreeSortType } from "./Book";

export interface DeviceSetting {
	deviceName: string;
	bookVaultPaths: {[vid:string]:string};
}

export const DEFAULT_DEVICE_SETTINGS: DeviceSetting = {
	deviceName: "",
	bookVaultPaths: {[MAIN_BOOKVAULT_ID]:"D:\\paper"},
};


export interface BookMasterSettings {
    deviceSetting: {[appId:string]:DeviceSetting};
    dataPath: string;

    validBookExts: Array<string>;

    currentBookVault: string;
    bookVaultNames: {[vid:string]:string};

    bookTreeSortType: BookTreeSortType;
    bookTreeSortAsc: boolean;
}

export const DEFAULT_SETTINGS: BookMasterSettings = {
    deviceSetting: {},
    dataPath: "bookmaster",

	validBookExts: ["pdf","epub"],

    currentBookVault: MAIN_BOOKVAULT_ID,
    bookVaultNames: {[MAIN_BOOKVAULT_ID]:"我的书库"},

    bookTreeSortType: BookTreeSortType.PATH,
    bookTreeSortAsc: true,
};