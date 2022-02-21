import { App } from "obsidian";

export const app: App = (window as any).app as App;
export const appId: string = (app as any).appId as string;


// create 16bit bid;
export function generateBid() {
    function S4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }  
    return S4()+S4()+S4()+S4();
}