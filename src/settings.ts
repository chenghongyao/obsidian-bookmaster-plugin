
import { AudioExts, ImageExts, MAIN_BOOKVAULT_ID, OfficeExts } from "./constants"; 
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
    openBookExtsWithDefaultApp: Array<string>;

    fixedAnnotationImageScale: number;
    annotationTemplate: {
        textAnnotation: string;
        regionAnnotation: string;
    }
}

export const DEFAULT_SETTINGS: BookMasterSettings = {
    deviceSetting: {},
    dataPath: "bookmaster",

	validBookExts: ["pdf", "epub","txt","html",
    ...OfficeExts,
    ...ImageExts,
    ...AudioExts],

    currentBookVault: MAIN_BOOKVAULT_ID,
    bookVaultNames: {[MAIN_BOOKVAULT_ID]:"我的书库"},

    bookTreeSortType: BookTreeSortType.PATH,
    bookTreeSortAsc: true,

    openAllBookWithDefaultApp: false,
    openBookExtsWithDefaultApp: [],

    fixedAnnotationImageScale: 2,
    annotationTemplate: {
        textAnnotation: "[{{content}}]({{url}})\n{{page}}\n{{comment}}\n\n",
        regionAnnotation: "![[{{img}}|{{width}}]]\n{{page}}\n{{comment}}\n\n"
    }
};