export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  role: "admin" | "user" | "moderator";
  avatar?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}
