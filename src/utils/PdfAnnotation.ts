import {AnnotationFactory, AnnotationIcon} from 'annotpdf';
import { Book } from '../Book';

function parseXfdfString(xfdfString: string) {
    return new DOMParser().parseFromString(xfdfString,'text/xml');	
}

function parseHexColorToRGB(hexColor: string) {
    return {
        r: parseInt(hexColor.substring(1,3),16), 
        g: parseInt(hexColor.substring(3,5),16), 
        b: parseInt(hexColor.substring(5,7),16)
    }
}



export default async function exportPDFAnnotation(author: string, filename: string, data: ArrayBuffer, xfdfString: string) {
    const xfdf = parseXfdfString(xfdfString);
    const annots = xfdf.getElementsByTagName("annots")?.[0];
    if (!annots) return;

    const factory = new AnnotationFactory(new Uint8Array(data));
    // console.log(await factory.getAnnotations());

    annots.childNodes.forEach((annotEl: HTMLElement) => {
        // console.log(annotEl);
        const page = parseInt(annotEl.getAttr("page"));
        const rect = annotEl.getAttr("rect").split(",").map(s => parseFloat(s));
        const creationdate = annotEl.getAttr("creationdate");
        var color: any;
        if (annotEl.getAttr("color")) {
            color = parseHexColorToRGB(annotEl.getAttr("color"));
        } else {
            color = {r: 0, g: 0, b: 0};
        }

        if (annotEl.nodeName === "highlight") {
            const coords = annotEl.getAttr("coords").split(",").map(s => parseFloat(s));
            // const content = annotEl.getElementsByTagName("contents")?.[0].textContent || "";
            const opacity = parseFloat(annotEl.getAttr("opacity") || "1");
            factory.createHighlightAnnotation({
                    page: page,
                    rect: rect,
                    author: author,
                    color: color,
                    // contents: content,
                    opacity: opacity,
                    quadPoints: coords,
            });
        } else if (annotEl.nodeName === "square") {

            var fillColor: any;
            if (annotEl.getAttr("interior-color")) {
                fillColor = parseHexColorToRGB(annotEl.getAttr("interior-color"));
            }
            const opacity = parseFloat(annotEl.getAttr("opacity") || "1");
            factory.createSquareAnnotation({
                page: page,
                rect: rect,
                author: author,
                contents: "",
                color: color,
                fill: fillColor,
                opacity: opacity
            })
        } 
        else if (annotEl.nodeName === "freetext") { //TODO: don't work
            var textColor;
            if (annotEl.getAttr("TextColor")) {
                textColor = parseHexColorToRGB(annotEl.getAttr("TextColor"));
            } else {
                textColor = {r: 255, g: 0, b: 0};
            }
            const fontSize = parseFloat(annotEl.getAttr("FontSize"));
            const content = annotEl.getElementsByTagName("contents")?.[0].textContent || "";
            // console.log("free text content",content);
            // console.log("rect", rect);
            const ta = factory.createFreeTextAnnotation({
                page: page,
                // color: {r:0, g: 0, b: 0},
                rect: rect,
                author: author,
                contents: content,
                textColor: textColor,
                fontSize: fontSize,
                // font: "/F",
            });
            ta.createDefaultAppearanceStream();

        } else if (annotEl.nodeName === "underline") {
            // const content = annotEl.getElementsByTagName("contents")?.[0].textContent || "";
            const coords = annotEl.getAttr("coords").split(",").map(s => parseFloat(s));
            factory.createUnderlineAnnotation({
                page: page,
                creationDate: creationdate,
                rect: rect,
                author: author,
                // contents: content,
                color: color,
                quadPoints: coords
            });
        } else if (annotEl.nodeName === "squiggly") { //TODO: dont work
            // const content = annotEl.getElementsByTagName("contents")?.[0].textContent || "";
            const coords = annotEl.getAttr("coords").split(",").map(s => parseFloat(s));
            factory.createSquigglyAnnotation({
                page: page,
                creationDate: creationdate,
                rect: rect,
                author: author,
                // contents: content,
                color: color,
                quadPoints: coords
            });
        } else if (annotEl.nodeName === "strikeout") {
            // const content = annotEl.getElementsByTagName("contents")?.[0].textContent || "";
            const coords = annotEl.getAttr("coords").split(",").map(s => parseFloat(s));
            factory.createStrikeOutAnnotation({
                page: page,
                creationDate: creationdate,
                rect: rect,
                author: author,
                // contents: content,
                color: color,
                quadPoints: coords
            });
        } else if (annotEl.nodeName === "ink") {
            const inklist = annotEl.getElementsByTagName("inklist")[0];

            const result = new Array<Array<number>>();
            inklist.childNodes.forEach((gesture: HTMLElement) => {
                const inks = gesture.textContent.split(";").map(p => p.split(",")).flat().map(x => parseFloat(x));
                result.push(inks);
            });

            factory.createInkAnnotation({
                page: page,
                creationDate: creationdate,
                rect: rect,
                author: author,
                color: color,
                inkList: result,
                // contents: content,
                // quadPoints: coords
            })
        } 
        // else if (annotEl.nodeName === "text") { // TODO: comment

        // }
        else {
            console.error("unknow annotation type:",annotEl)
        }
    });

    factory.download(filename)
}