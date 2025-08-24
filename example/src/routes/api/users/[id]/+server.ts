import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { User } from "$lib/types";

const users: User[] = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    username: "johndoe",
    role: "admin",
    avatar: "https://via.placeholder.com/64x64",
    bio: "Software developer and tech enthusiast",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    username: "janesmith",
    role: "user",
    avatar: "https://via.placeholder.com/64x64",
    bio: "Designer and creative professional",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
  {
    id: 3,
    name: "Bob Wilson",
    email: "bob@example.com",
    username: "bobwilson",
    role: "moderator",
    avatar: "https://via.placeholder.com/64x64",
    bio: "Community moderator and content curator",
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-03T00:00:00Z",
  },
  {
    id: 4,
    name: "Alice Johnson",
    email: "alice@example.com",
    username: "alicejohnson",
    role: "user",
    avatar: "https://via.placeholder.com/64x64",
    bio: "Marketing specialist and content creator",
    createdAt: "2024-01-04T00:00:00Z",
    updatedAt: "2024-01-04T00:00:00Z",
  },
  {
    id: 5,
    name: "Charlie Brown",
    email: "charlie@example.com",
    username: "charliebrown",
    role: "user",
    avatar: "https://via.placeholder.com/64x64",
    bio: "Data analyst and visualization expert",
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-05T00:00:00Z",
  },
];

export const GET: RequestHandler = async ({ params }) => {
  const userId = parseInt(params.id);
  const user = users.find((u) => u.id === userId);

  if (!user) {
    throw error(404, "User not found");
  }

  await new Promise((resolve) => setTimeout(resolve, 100));

  return json(user);
};

export const PUT: RequestHandler = async ({ params, request }) => {
  const userId = parseInt(params.id);
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    throw error(404, "User not found");
  }

  const updates = await request.json();
  const updatedUser = {
    ...users[userIndex],
    ...updates,
    id: userId,
    updatedAt: new Date().toISOString(),
  };

  users[userIndex] = updatedUser;

  await new Promise((resolve) => setTimeout(resolve, 150));

  return json(updatedUser);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const userId = parseInt(params.id);
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    throw error(404, "User not found");
  }

  const deletedUser = users.splice(userIndex, 1)[0];

  await new Promise((resolve) => setTimeout(resolve, 100));

  return json({ message: "User deleted", user: deletedUser });
};
