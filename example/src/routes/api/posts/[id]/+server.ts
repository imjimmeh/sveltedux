import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { Post } from "$lib/types";

let posts: Post[] = [
  {
    id: 1,
    title: "Getting Started with SvelteDux",
    content:
      "SvelteDux provides a powerful state management solution for Svelte applications. With its Redux-inspired architecture, you can manage complex application state with predictable patterns and excellent developer experience.",
    excerpt: "Learn the basics of SvelteDux state management",
    authorId: 1,
    authorName: "John Doe",
    tags: ["svelte", "redux", "state-management"],
    published: true,
    featured: true,
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
  },
  {
    id: 2,
    title: "Advanced API Patterns",
    content:
      "Explore advanced patterns for API integration using SvelteDux query functionality. Learn how to implement caching, optimistic updates, and background refetching for a seamless user experience.",
    excerpt: "Advanced techniques for API data fetching and caching",
    authorId: 2,
    authorName: "Jane Smith",
    tags: ["api", "async", "caching"],
    published: true,
    featured: false,
    createdAt: "2024-01-02T14:30:00Z",
    updatedAt: "2024-01-02T14:30:00Z",
  },
  {
    id: 3,
    title: "Entity Management Best Practices",
    content:
      "Best practices for managing normalized data using entity adapters. Learn how to efficiently store and query relational data in your Redux store with built-in CRUD operations.",
    excerpt: "Efficient entity state management patterns",
    authorId: 3,
    authorName: "Bob Wilson",
    tags: ["entities", "normalization", "patterns"],
    published: true,
    featured: true,
    createdAt: "2024-01-03T09:15:00Z",
    updatedAt: "2024-01-03T09:15:00Z",
  },
  {
    id: 4,
    title: "Performance Optimization Tips",
    content:
      "Tips and tricks for optimizing your SvelteDux applications for better performance. Learn about selector memoization, efficient updates, and reducing unnecessary re-renders.",
    excerpt: "Optimize your app with these performance tips",
    authorId: 1,
    authorName: "John Doe",
    tags: ["performance", "optimization", "best-practices"],
    published: true,
    featured: false,
    createdAt: "2024-01-04T16:45:00Z",
    updatedAt: "2024-01-04T16:45:00Z",
  },
  {
    id: 5,
    title: "Building Real-time Features",
    content:
      "How to implement real-time features using SvelteDux with WebSocket integration. Create live chat, notifications, and collaborative editing features with ease.",
    excerpt: "Add real-time capabilities to your applications",
    authorId: 4,
    authorName: "Alice Johnson",
    tags: ["real-time", "websockets", "live-updates"],
    published: false,
    featured: false,
    createdAt: "2024-01-05T11:20:00Z",
    updatedAt: "2024-01-05T11:20:00Z",
  },
  {
    id: 6,
    title: "Testing Strategies",
    content:
      "Comprehensive testing strategies for SvelteDux applications. Learn how to test your reducers, selectors, and async thunks effectively with real-world examples.",
    excerpt: "Test your state management effectively",
    authorId: 5,
    authorName: "Charlie Brown",
    tags: ["testing", "quality-assurance", "best-practices"],
    published: true,
    featured: false,
    createdAt: "2024-01-06T13:10:00Z",
    updatedAt: "2024-01-06T13:10:00Z",
  },
];

export const GET: RequestHandler = async ({ params }) => {
  const postId = parseInt(params.id);
  const post = posts.find((p) => p.id === postId);

  if (!post) {
    throw error(404, "Post not found");
  }

  await new Promise((resolve) => setTimeout(resolve, 120));

  return json(post);
};

export const PUT: RequestHandler = async ({ params, request }) => {
  const postId = parseInt(params.id);
  const postIndex = posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    throw error(404, "Post not found");
  }

  const updates = await request.json();
  const updatedPost = {
    ...posts[postIndex],
    ...updates,
    id: postId,
    updatedAt: new Date().toISOString(),
  };

  posts[postIndex] = updatedPost;

  await new Promise((resolve) => setTimeout(resolve, 200));

  return json(updatedPost);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const postId = parseInt(params.id);
  const postIndex = posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    throw error(404, "Post not found");
  }

  const deletedPost = posts.splice(postIndex, 1)[0];

  await new Promise((resolve) => setTimeout(resolve, 120));

  return json({ message: "Post deleted", post: deletedPost });
};
