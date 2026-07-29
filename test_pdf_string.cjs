const { PDFString } = require('pdf-lib');
const str = "var re = new RegExp(\"^[^\\\\s@]+\");";
const pdfStr = PDFString.of(str);
console.log("Memory:", str);
console.log(Buffer.from(pdfStr.asBytes()).toString());
