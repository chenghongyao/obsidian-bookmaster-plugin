

export enum AnnotationType {
    highlight,
    underline,
    region,
}
export class Annotation {
    type: AnnotationType;
    penColor: string;
    brushColor: string;
    squars: any; // TODO squars type
}