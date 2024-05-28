
// enums.ts
export enum TestStatus {
  failed = 'failed',
  new = 'new',
  ok = 'ok',
  unresolved = 'unresolved',
  approved = 'approved',
  autoApproved = 'autoApproved'
}

export enum ImageComparison {
  pixelmatch = 'pixelmatch',
  lookSame = 'lookSame',
  odiff = 'odiff'
}

export enum Role {
  admin = 'admin',
  editor = 'editor',
  guest = 'guest'
}
