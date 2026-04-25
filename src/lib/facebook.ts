export interface ParsedPost {
  fbPostId: string;
  authorName: string;
  authorProfileUrl: string | null;
  content: string;
  imageUrl: string | null;
  postUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdTime: Date;
}

export interface FetchOptions {
  hashtag: string;
  startDate: Date;
  endDate: Date;
}
