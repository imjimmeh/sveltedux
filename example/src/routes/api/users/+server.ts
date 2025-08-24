import { json } from "@sveltejs/kit";
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

let nextId = 6;

export const GET: RequestHandler = async ({ url }) => {
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const role = url.searchParams.get("role");

  let filteredUsers = users;
  if (role) {
    filteredUsers = users.filter((user) => user.role === role);
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedUsers = filteredUsers.slice(start, end);

  await new Promise((resolve) => setTimeout(resolve, 100));

  return json({
    data: paginatedUsers,
    meta: {
      page,
      limit,
      total: filteredUsers.length,
      totalPages: Math.ceil(filteredUsers.length / limit),
    },
  });
};

export const POST: RequestHandler = async ({ request }) => {
  const userData = await request.json();

  const newUser: User = {
    id: nextId++,
    name: userData.name,
    email: userData.email,
    username: userData.username,
    role: userData.role || "user",
    avatar: userData.avatar,
    bio: userData.bio,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(newUser);

  await new Promise((resolve) => setTimeout(resolve, 200));

  return json(newUser, { status: 201 });
};
