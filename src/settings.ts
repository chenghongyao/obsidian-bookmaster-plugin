
import { MAIN_BOOKVAULT_ID } from "./constants";

export interface DeviceSettings {
	deviceName: string;
	bookVaultPaths: {[vid:string]:string};
}

export const DEFAULT_DEVICE_SETTINGS: DeviceSettings = {
	deviceName: "",
	bookVaultPaths: {[MAIN_BOOKVAULT_ID]:"D:\\paper"},
};


export interface BookMasterSettings {
    deviceSetting: {[appId:string]:DeviceSettings};
    dataPath: string;

    validBookExts: Array<string>;

    currentBookVault: string;
    bookVaultNames: {[vid:string]:string};
}

export const DEFAULT_SETTINGS: BookMasterSettings = {
    deviceSetting: {},
    dataPath: "bookmaster",

	validBookExts: ["pdf","epub"],

    currentBookVault: MAIN_BOOKVAULT_ID,
    bookVaultNames: {[MAIN_BOOKVAULT_ID]:"我的书库"},

};