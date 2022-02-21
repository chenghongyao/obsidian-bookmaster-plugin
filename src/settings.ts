
import { MAIN_BOOKVAULT_ID } from "./constants";

export interface DeviceSettings {
	deviceName: string;
	bookVaultPaths: Array<string>;
}

export const DEFAULT_DEVICE_SETTINGS: DeviceSettings = {
	deviceName: "",
	bookVaultPaths: [""],
};


export interface BookMasterSettings {
    deviceSetting: {[appId:string]:DeviceSettings};
    dataPath: string;

    displayBookExt: Array<string>;

    currentBookVault: string;
    bookVaultNames: Array<{id:string,name:string}>;
}

export const DEFAULT_SETTINGS: BookMasterSettings = {
    deviceSetting: {},
    dataPath: "bookmaster",

	displayBookExt: ["pdf","epub"],

    currentBookVault: MAIN_BOOKVAULT_ID,
    bookVaultNames: [{id:MAIN_BOOKVAULT_ID,name:"我的书库"}],

};