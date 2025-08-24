import { createApi, fetchBaseQuery } from "../../../../library/dist/api/index";
import type { User } from "../store/user/types";
import type { Todo } from "../store/todos/types";
import type { Post } from "$lib/types";

interface ApiError {
  message: string;
  code: string | number;
}

interface PaginatedUsersResponse {
  data: User[];
  meta: {
    total: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
  };
}

interface PaginatedPostsResponse {
  data: Post[];
  meta: {
    total: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
  };
}

// Create the API service
export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    timeout: 30000,
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["User", "Todo", "Post"],
  endpoints: (build) => ({
    // User endpoints
    getUser: build.query<User, number>({
      query: (userId) => `/users/${userId}`,
      providesTags: (result, error, userId) => [{ type: "User", id: userId }],
      transformErrorResponse: (response): ApiError => ({
        message: response.status === 404 ? "User not found" : `HTTP ${response.status}: ${response.statusText}`,
        code: response.status
      }),
      keepUnusedDataFor: 30000, // 30 seconds cache like the thunk
    }),

    getUsers: build.query<PaginatedUsersResponse, { page?: number; limit?: number; role?: string }>({
      query: ({ page = 1, limit = 5, role }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (role) params.append('role', role);
        return `/users?${params}`;
      },
      providesTags: ["User"],
      transformResponse: (response: any): PaginatedUsersResponse => {
        // Mock response if needed
        if (!response || !response.data) {
          const mockUsers: User[] = [
            {
              id: 1,
              name: "John Doe",
              email: "john@example.com",
              username: "johndoe",
              role: "admin",
              bio: "System administrator",
              avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john"
            },
            {
              id: 2,
              name: "Jane Smith", 
              email: "jane@example.com",
              username: "janesmith",
              role: "user",
              bio: "Regular user",
              avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane"
            }
          ];
          return {
            data: mockUsers,
            meta: {
              total: mockUsers.length,
              totalPages: Math.ceil(mockUsers.length / (limit || 5)),
              currentPage: page || 1,
              perPage: limit || 5
            }
          };
        }
        return response;
      },
      transformErrorResponse: (response): ApiError => ({
        message: response.statusText || "Failed to fetch users",
        code: "FETCH_ERROR"
      }),
    }),

    createUser: build.mutation<User, Partial<User>>({
      query: (userData) => ({
        url: "/users",
        method: "POST",
        body: userData,
      }),
      invalidatesTags: ["User"],
      transformResponse: (response: any): User => ({
        id: response.id || Date.now(),
        name: response.name || "",
        email: response.email || "",
        username: response.username || "",
        role: response.role || "user",
        bio: response.bio || "",
        avatar: response.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.username}`
      }),
      transformErrorResponse: (response): ApiError => ({
        message: response.statusText || "Failed to create user",
        code: "CREATE_ERROR"
      }),
    }),

    deleteUser: build.mutation<{ success: boolean }, number>({
      query: (userId) => ({
        url: `/users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
      transformErrorResponse: (response): ApiError => ({
        message: response.statusText || "Failed to delete user",
        code: "DELETE_ERROR"
      }),
    }),

    // Todo endpoints
    getTodos: build.query<Todo[], void>({
      query: () => "/todos",
      providesTags: ["Todo"],
      transformErrorResponse: (response): ApiError => ({
        message: `Failed to fetch todos: ${response.statusText}`,
        code: "FETCH_ERROR"
      }),
    }),

    addTodo: build.mutation<Todo, { text: string }>({
      query: ({ text }) => ({
        url: "/todos",
        method: "POST",
        body: { text, completed: false },
      }),
      invalidatesTags: ["Todo"],
      transformResponse: (response: any): Todo => ({
        id: response.id || Date.now(),
        text: response.text,
        completed: response.completed || false,
      }),
      transformErrorResponse: (response): ApiError => ({
        message: response.statusText || "Failed to create todo",
        code: "CREATE_ERROR"
      }),
      // Note: Optimistic updates would be implemented via onQueryStarted if supported
    }),

    updateTodo: build.mutation<Todo, { id: number; text?: string; completed?: boolean }>({
      query: ({ id, ...patch }) => ({
        url: `/todos/${id}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Todo", id }],
      transformErrorResponse: (response): ApiError => ({
        message: response.statusText || "Failed to update todo",
        code: "UPDATE_ERROR"
      }),
    }),

    deleteTodo: build.mutation<{ success: boolean }, number>({
      query: (id) => ({
        url: `/todos/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Todo"],
      transformErrorResponse: (response): ApiError => ({
        message: response.statusText || "Failed to delete todo",
        code: "DELETE_ERROR"
      }),
    }),

    searchTodos: build.query<Todo[], string>({
      query: (searchQuery) => `/todos/search?q=${encodeURIComponent(searchQuery)}`,
      providesTags: ["Todo"],
      transformResponse: (response: Todo[], meta, arg): Todo[] => {
        // Mock search results if needed
        if (!response || response.length === 0) {
          const mockTodos: Todo[] = [
            { id: 1, text: `Search result for "${arg}"`, completed: false },
            { id: 2, text: `Another result for "${arg}"`, completed: true },
          ];
          return mockTodos.filter((todo) =>
            todo.text.toLowerCase().includes(arg.toLowerCase())
          );
        }
        return response;
      },
      transformErrorResponse: (response): ApiError => ({
        message: response.statusText || "Search failed",
        code: "SEARCH_ERROR"
      }),
    }),

    // Post endpoints
    getPosts: build.query<PaginatedPostsResponse, { page?: number; limit?: number; published?: boolean; authorId?: number }>({
      query: ({ page = 1, limit = 3, published, authorId }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (published !== undefined) params.append('published', published.toString());
        if (authorId) params.append('authorId', authorId.toString());
        return `/posts?${params}`;
      },
      providesTags: ["Post"],
      transformResponse: (response: any): PaginatedPostsResponse => {
        // Mock response if needed
        if (!response || !response.data) {
          const mockPosts: Post[] = [
            {
              id: 1,
              title: "Getting Started with SvelteKit",
              content: "SvelteKit is a fantastic framework for building web applications. In this post, we'll explore its key features and how to get started with your first project.",
              excerpt: "SvelteKit is a fantastic framework for building web applications...",
              authorId: 1,
              authorName: "John Doe",
              tags: ["svelte", "web-development", "javascript"],
              published: true,
              featured: true,
              createdAt: new Date(2024, 0, 15).toISOString(),
              updatedAt: new Date(2024, 0, 15).toISOString()
            },
            {
              id: 2,
              title: "Advanced TypeScript Tips",
              content: "TypeScript offers many advanced features that can make your code more robust and maintainable. Let's dive into some advanced patterns and techniques.",
              excerpt: "TypeScript offers many advanced features that can make your code more robust...",
              authorId: 2,
              authorName: "Jane Smith",
              tags: ["typescript", "programming", "best-practices"],
              published: true,
              featured: false,
              createdAt: new Date(2024, 0, 20).toISOString(),
              updatedAt: new Date(2024, 0, 20).toISOString()
            },
            {
              id: 3,
              title: "Building RESTful APIs",
              content: "Creating robust and scalable REST APIs is crucial for modern web applications. This guide covers best practices and common patterns.",
              excerpt: "Creating robust and scalable REST APIs is crucial for modern web applications...",
              authorId: 3,
              authorName: "Bob Wilson",
              tags: ["api", "rest", "backend"],
              published: false,
              featured: false,
              createdAt: new Date(2024, 0, 25).toISOString(),
              updatedAt: new Date(2024, 0, 25).toISOString()
            }
          ];
          
          // Apply filters
          let filteredPosts = mockPosts;
          if (published !== undefined) {
            filteredPosts = filteredPosts.filter(post => post.published === published);
          }
          if (authorId) {
            filteredPosts = filteredPosts.filter(post => post.authorId === authorId);
          }
          
          const startIndex = (page - 1) * limit;
          const paginatedPosts = filteredPosts.slice(startIndex, startIndex + limit);
          
          return {
            data: paginatedPosts,
            meta: {
              total: filteredPosts.length,
              totalPages: Math.ceil(filteredPosts.length / limit),
              currentPage: page,
              perPage: limit
            }
          };
        }
        return response;
      },
      transformErrorResponse: (response): ApiError => ({
        message: response.statusText || "Failed to fetch posts",
        code: "FETCH_ERROR"
      }),
    }),

    createPost: build.mutation<Post, Partial<Post>>({
      query: (postData) => ({
        url: "/posts",
        method: "POST",
        body: postData,
      }),
      invalidatesTags: ["Post"],
      transformResponse: (response: any): Post => ({
        id: response.id || Date.now(),
        title: response.title || "",
        content: response.content || "",
        excerpt: response.excerpt || response.content?.substring(0, 120) + "..." || "",
        authorId: response.authorId || 1,
        authorName: response.authorName || "Unknown Author",
        tags: response.tags || [],
        published: response.published || false,
        featured: response.featured || false,
        createdAt: response.createdAt || new Date().toISOString(),
        updatedAt: response.updatedAt || new Date().toISOString()
      }),
      transformErrorResponse: (response): ApiError => ({
        message: response.statusText || "Failed to create post",
        code: "CREATE_ERROR"
      }),
    }),

    updatePost: build.mutation<Post, { id: number; updates: Partial<Post> }>({
      query: ({ id, updates }) => ({
        url: `/posts/${id}`,
        method: "PATCH",
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Post", id }],
      transformErrorResponse: (response): ApiError => ({
        message: response.statusText || "Failed to update post",
        code: "UPDATE_ERROR"
      }),
    }),

    deletePost: build.mutation<{ success: boolean }, number>({
      query: (postId) => ({
        url: `/posts/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Post"],
      transformErrorResponse: (response): ApiError => ({
        message: response.statusText || "Failed to delete post",
        code: "DELETE_ERROR"
      }),
    }),
  }),
});

// Export the API for use in store configuration
export { api as todoApi };