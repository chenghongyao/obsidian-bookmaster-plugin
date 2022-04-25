
import { AudioExts, ImageExts, MAIN_BOOKVAULT_ID, OfficeExts, VideoExts } from "./constants"; 
import { BookTreeSortType } from "./Book";

export interface DeviceSetting {
	deviceName: string;
	bookVaultPaths: {[vid:string]:string};
    bookViewerWorkerPath: string;
}

export const DEFAULT_DEVICE_SETTINGS: DeviceSetting = {
	deviceName: "",
	bookVaultPaths: {[MAIN_BOOKVAULT_ID]:"D:\\paper"},
    bookViewerWorkerPath: "http://81.68.152.226:8863",
};


export interface BookMasterSettings {
    deviceSetting: {[appId:string]:DeviceSetting};
    dataPath: string;

    showBookExts: Array<string>;

    currentBookVault: string;
    bookVaultNames: {[vid:string]:string};

    bookTreeSortType: BookTreeSortType;
    bookTreeSortAsc: boolean;

    openAllBookWithDefaultApp: boolean;
    openBookExtsWithDefaultApp: Array<string>;

    fixedAnnotationImageScale: number;
    annotationTemplate: {
        pdf: {
            textAnnotation: string;
            regionAnnotation: string;    
        }
    }
}

export const DEFAULT_SETTINGS: BookMasterSettings = {
    deviceSetting: {},
    dataPath: "bookmaster",

	showBookExts: ["pdf", "epub","txt","html",
    ...OfficeExts,
    ...ImageExts,
    ...AudioExts,
    ...VideoExts],

    currentBookVault: MAIN_BOOKVAULT_ID,
    bookVaultNames: {[MAIN_BOOKVAULT_ID]:"我的书库"},

    bookTreeSortType: BookTreeSortType.PATH,
    bookTreeSortAsc: true,

    openAllBookWithDefaultApp: false,
    openBookExtsWithDefaultApp: [],

    fixedAnnotationImageScale: 2,
    annotationTemplate: {
        pdf: {
            textAnnotation: "[{{content}}]({{url}})\n{{page}}\n{{comment}}\n\n",
            regionAnnotation: "![[{{img}}|{{width}}]]\n{{page}}\n{{comment}}\n\n"
        }
    }
};