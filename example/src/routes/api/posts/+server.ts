import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { Post } from "$lib/types";

let posts: Post[] = [
  {
    id: 1,
    title: "Getting Started with SvelteDux",
    content:
      "SvelteDux provides a powerful state management solution for Svelte applications...",
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
      "Explore advanced patterns for API integration using SvelteDux query functionality...",
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
      "Best practices for managing normalized data using entity adapters...",
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
      "Tips and tricks for optimizing your SvelteDux applications for better performance...",
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
      "How to implement real-time features using SvelteDux with WebSocket integration...",
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
    content: "Comprehensive testing strategies for SvelteDux applications...",
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

let nextId = 7;

export const GET: RequestHandler = async ({ url }) => {
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const authorId = url.searchParams.get("authorId");
  const published = url.searchParams.get("published");
  const featured = url.searchParams.get("featured");
  const tag = url.searchParams.get("tag");

  let filteredPosts = posts;

  if (authorId) {
    filteredPosts = filteredPosts.filter(
      (post) => post.authorId === parseInt(authorId)
    );
  }

  if (published !== null && published !== undefined) {
    filteredPosts = filteredPosts.filter(
      (post) => post.published === (published === "true")
    );
  }

  if (featured !== null && featured !== undefined) {
    filteredPosts = filteredPosts.filter(
      (post) => post.featured === (featured === "true")
    );
  }

  if (tag) {
    filteredPosts = filteredPosts.filter((post) => post.tags.includes(tag));
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedPosts = filteredPosts.slice(start, end);

  await new Promise((resolve) => setTimeout(resolve, 150));

  return json({
    data: paginatedPosts,
    meta: {
      page,
      limit,
      total: filteredPosts.length,
      totalPages: Math.ceil(filteredPosts.length / limit),
    },
  });
};

export const POST: RequestHandler = async ({ request }) => {
  const postData = await request.json();

  const newPost: Post = {
    id: nextId++,
    title: postData.title,
    content: postData.content,
    excerpt: postData.excerpt || postData.content.substring(0, 100) + "...",
    authorId: postData.authorId,
    authorName: postData.authorName,
    tags: postData.tags || [],
    published: postData.published || false,
    featured: postData.featured || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  posts.push(newPost);

  await new Promise((resolve) => setTimeout(resolve, 250));

  return json(newPost, { status: 201 });
};
