declare module 'exif-parser' {
  interface ExifResult {
    tags: {
      [key: string]: any;
    };
    imageSize: {
      width: number;
      height: number;
    };
  }

  interface ExifParser {
    parse(): ExifResult;
  }

  function create(buffer: Buffer): ExifParser;
  
  export = {
    create
  };
}
