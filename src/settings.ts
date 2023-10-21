
import { AudioExts, ImageExts, OfficeExts, VideoExts } from "./constants"; 
import {MAIN_BOOKVAULT_ID} from "./BookVault"; 
import { BookTreeSortType } from "./Book";
import { DocumentViewerTheme } from "./document_viewer/documentViewer";


export interface DeviceSetting {
	deviceName: string;
    bookViewerWorkerPath: string;
	bookVaultPaths: {[vid:string]:string};
}

export const DEFAULT_DEVICE_SETTINGS: DeviceSetting = {
	deviceName: "",
	bookVaultPaths: {},     
    bookViewerWorkerPath: "http://81.71.65.248:8866",
};


export interface BookMasterSettings {
    deviceSetting: {[appId:string]:DeviceSetting};
    dataPath: string;

    showBookExts: Array<string>;
    openAllBookWithDefaultApp: boolean;
    openBookExtsWithDefaultApp: Array<string>;
    
    bookVaultNames: {[vid:string]:string};
    currentBookVault: string;
    bookTreeSortType: BookTreeSortType;
    bookTreeSortAsc: boolean;

    // book view
    documentViewerTheme: DocumentViewerTheme;

    // recent book view
    recentBookNumberLimit: number;

    // book project view
    pinProjectFile: boolean;

    // annotations
    annotationAuthor: string;
    fixedAnnotationImageScale: number;
    annotationTemplate: {
        pdf: {
            textAnnotation: string;
            regionAnnotation: string;    
            pageAnnotation: string;
        }
    };

    //
    autoChangeBookStatusWhenOpen: boolean;
    autoInsertNewAnnotation: boolean;
}


export const DEFAULT_SETTINGS: BookMasterSettings = {
    deviceSetting: {},
    dataPath: "bookmaster",

    // documentViewerTheme: DocumentViewerTheme.Dark,
	showBookExts: ["pdf", "epub","txt","html",
    ...OfficeExts,
    ...ImageExts,
    ...AudioExts,
    ...VideoExts],
    openAllBookWithDefaultApp: false,
    openBookExtsWithDefaultApp: [],

    bookVaultNames: {},
    currentBookVault: MAIN_BOOKVAULT_ID,

    bookTreeSortType: BookTreeSortType.PATH,
    bookTreeSortAsc: true,

    // book view
    documentViewerTheme: DocumentViewerTheme.Dark,

    //recent book view
    recentBookNumberLimit: 20,

    // book project view
    pinProjectFile: false,

    // annotations
    annotationAuthor: "Guest",
    fixedAnnotationImageScale: 2.0,
    annotationTemplate: {
        pdf: {
            textAnnotation: "[{{content}}]({{url}})\n",
            regionAnnotation: "![[{{img}}|{{width}}]]\n",
            pageAnnotation: "[{{title}}]({{url}})\n"
        }
    },

    autoChangeBookStatusWhenOpen: true,
    autoInsertNewAnnotation: false,
}