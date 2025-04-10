declare module 'html2pdf.js' {
  function html2pdf(): {
    set: (options: any) => {
      from: (element: HTMLElement) => {
        save: () => Promise<void>;
      };
    };
  };
  
  export = html2pdf;
} 