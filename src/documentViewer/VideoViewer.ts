import { DocumentViewer } from "./documentViewer";
import { VideoExts } from "../constants";

export class VideoViewer extends DocumentViewer {

    videoContainer: HTMLDivElement;
    videoControlEl: HTMLAudioElement;
    videoSourceEl: HTMLSourceElement;

    constructor(bid:string, container: HTMLElement) {
        super(bid, container);
        this.videoContainer = this.container.createDiv();
        this.videoContainer.addClass("video-container");
    }

    static isSupportedExt(ext: string) {
		return VideoExts.includes(ext);
	}

    async show(url: string, state?: any, ext?: string){
        this.videoControlEl = this.videoContainer.createEl("video");
        this.videoControlEl.addClass("video-controls");

        this.videoControlEl.controls = true;
        
        this.videoSourceEl = this.videoControlEl.createEl("source");
        this.videoSourceEl.src = url;

        this.setState(state);
    }

    async closeDocument() {
    }

    getState() {
        return {
            currentTime: this.videoControlEl.currentTime,
            volume: this.videoControlEl.volume,
        } 
    }

	setState(state?: any): void {
        if (!state) return;
        if (state.currentTime !== undefined) {
            this.videoControlEl.currentTime = state.currentTime;
        }

        if (state.volume !== undefined) {
            this.videoControlEl.volume = state.volume;
        }
	}

}