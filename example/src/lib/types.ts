export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  role: "admin" | "user" | "moderator";
  avatar?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  authorId: number;
  authorName: string;
  tags: string[];
  published: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}
