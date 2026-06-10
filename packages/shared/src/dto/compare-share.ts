export interface CompareSharePair {
  leftId: string;
  rightId: string;
}

export interface CreateCompareShareResult {
  token: string;
  expiresInSeconds: number;
}
