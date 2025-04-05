declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    numPages: number;
    version: string;
  }

  interface PDFOptions {
    pagerender?: Function;
    max?: number;
    [key: string]: any;
  }

  function parse(buffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  
  export = parse;
}

declare module 'pdf-parse/lib/pdf-parse.js' {
  import parse = require('pdf-parse');
  export = parse;
  export default parse;
} 