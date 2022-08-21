import { DocumentViewer } from "./documentViewer";
import { AudioExts } from "../constants";


export class AudioViewer extends DocumentViewer {

    audioContainer: HTMLDivElement;
    audioControlEl: HTMLAudioElement;
    audioSourceEl: HTMLSourceElement;

    constructor(bid:string, container: HTMLElement) {
        super(bid, container);
        this.audioContainer = this.container.createDiv();
        this.audioContainer.addClass("audio-container");
    }

    static isSupportedExt(ext: string) {
		return AudioExts.includes(ext);
	}

    async show(url: string, state?: any, ext?: string){
        this.audioControlEl = this.audioContainer.createEl("audio");
        this.audioControlEl.addClass("audio-controls");

        this.audioControlEl.controls = true;
        this.audioSourceEl = this.audioControlEl.createEl("source");
        this.audioSourceEl.src = url;

        this.setState(state);
    }

    async closeDocument() {
    }

    getState() {
        return {
            currentTime: this.audioControlEl.currentTime,
            volume: this.audioControlEl.volume,
        } 
    }

	setState(state?: any): void {
        if (!state) return;
        if (state.currentTime !== undefined) {
            this.audioControlEl.currentTime = state.currentTime;
        }

        if (state.volume !== undefined) {
            this.audioControlEl.volume = state.volume;
        }
	}

}