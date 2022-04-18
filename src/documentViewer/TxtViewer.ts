import { request } from "obsidian";
import { DocumentViewer } from "./documentViewer";


export class TxtViewer extends DocumentViewer {

    constructor(container: HTMLElement) {
        super(container);
    }

    async show(data: ArrayBuffer, state?: any, ext?: string){
        // console.log(data
        // const array = new Uint8Array(data)


        // const encodedString = String.fromCharCode.apply(null,new Uint8Array(data));
        // let decodedString = decodeURIComponent(escape(encodedString));
        // console.log(decodedString);
        const f = new FileReader();
        
        f.readAsText(new Blob([data]));
        f.onload = () => {
            const content = f.result as string;

            const lines = content.split("\r\n");
            this.container.innerHTML = lines.map((l) => {return '<div><p>'+l+'</p><div>'}).join("\n");
            Promise.resolve()
        }

        f.onerror = (e) => {
            Promise.reject(f.result);
        }
    }

    async closeDocument() {
    }

    getState() {
        throw new Error("Method not implemented.");
    }

}