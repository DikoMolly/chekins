import 'multer';

declare module 'multer' {
  namespace Express {
    namespace Multer {
      interface File {
        resource_type?: string;
      }
    }
  }
}
