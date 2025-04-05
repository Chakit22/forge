declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    numPages: number;
    version: string;
  }

  interface PDFOptions {
    pagerender?: (pageData: { getTextContent: () => Promise<unknown> }) => Promise<string>;
    max?: number;
    [key: string]: unknown;
  }

  function parse(buffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  
  export = parse;
}

declare module 'pdf-parse/lib/pdf-parse.js' {
  import parse from "pdf-parse";
  export = parse;
} 