
import { MAIN_BOOKVAULT_ID } from "./constants";

export interface DeviceSettings {
	deviceName: string;
	bookVaultPaths: {[vid:string]:string};
}

export const DEFAULT_DEVICE_SETTINGS: DeviceSettings = {
	deviceName: "",
	bookVaultPaths: {MAIN_BOOKVAULT_ID:""},
};


export interface BookMasterSettings {
    deviceSetting: {[appId:string]:DeviceSettings};
    dataPath: string;

    displayBookExt: Array<string>;

    currentBookVault: string;
    bookVaultNames: {[vid:string]:string};
}

export const DEFAULT_SETTINGS: BookMasterSettings = {
    deviceSetting: {},
    dataPath: "bookmaster",

	displayBookExt: ["pdf","epub"],

    currentBookVault: MAIN_BOOKVAULT_ID,
    bookVaultNames: {MAIN_BOOKVAULT_ID:"我的书库"},

};