

export interface BookAttribute {
	title: string;
	alias?: string|null;
}

export interface AbstractBook {
	vault:string;
	path: string;
	name: string;
    ext?: string;
	children?: Array<AbstractBook>;
	attrs?: any;
}

