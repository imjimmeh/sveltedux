import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { createStore, combineReducers, applyMiddleware } from '../../../../library/src/lib/index.js';
import { api } from '../store/index.js';
import UsersList from './UsersList.svelte';
import PostsList from './PostsList.svelte';
import type { User } from '$lib/types.js';
import type { Post } from '$lib/types.js';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock store for components
let mockStore: ReturnType<typeof createStore>;

// Mock data
const mockUsers: User[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    username: 'johndoe',
    role: 'admin',
    avatar: 'https://via.placeholder.com/64x64',
    bio: 'Software developer',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    username: 'janesmith',
    role: 'user',
    avatar: 'https://via.placeholder.com/64x64',
    bio: 'Designer',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
];

const mockPosts: Post[] = [
  {
    id: 1,
    title: 'First Post',
    content: 'This is the content of the first post.',
    excerpt: 'This is the content...',
    authorId: 1,
    authorName: 'John Doe',
    tags: ['svelte', 'redux'],
    published: true,
    featured: true,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z'
  },
  {
    id: 2,
    title: 'Second Post',
    content: 'This is the content of the second post.',
    excerpt: 'This is the content...',
    authorId: 2,
    authorName: 'Jane Smith',
    tags: ['api', 'testing'],
    published: false,
    featured: false,
    createdAt: '2024-01-02T14:30:00Z',
    updatedAt: '2024-01-02T14:30:00Z'
  }
];

describe('Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create fresh store for each test
    mockStore = createStore(combineReducers({
      [api.reducerPath]: api.reducer
    }), undefined, applyMiddleware(api.middleware));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('UsersList Component', () => {
    it('should render loading state initially', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(UsersList);

      await waitFor(() => {
        expect(screen.getByText('Loading users...')).toBeInTheDocument();
      });
    });

    it('should render users after loading', async () => {
      const mockResponse = {
        data: mockUsers,
        meta: {
          page: 1,
          limit: 5,
          total: 2,
          totalPages: 1
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(UsersList);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('@johndoe')).toBeInTheDocument();
        expect(screen.getByText('@janesmith')).toBeInTheDocument();
      });
    });

    it('should render error state when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        json: async () => ({ message: 'Server error' })
      });

      render(UsersList);

      await waitFor(() => {
        expect(screen.getByText(/Error loading users/)).toBeInTheDocument();
      });
    });

    it('should show role badges correctly', async () => {
      const mockResponse = {
        data: mockUsers,
        meta: {
          page: 1,
          limit: 5,
          total: 2,
          totalPages: 1
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(UsersList);

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('user')).toBeInTheDocument();
      });
    });

    it('should handle pagination controls', async () => {
      const mockResponse = {
        data: mockUsers.slice(0, 1),
        meta: {
          page: 1,
          limit: 1,
          total: 2,
          totalPages: 2
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(UsersList);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });
    });

    it('should handle role filter changes', async () => {
      const mockResponse = {
        data: mockUsers.filter(u => u.role === 'admin'),
        meta: {
          page: 1,
          limit: 5,
          total: 1,
          totalPages: 1
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(UsersList);

      const roleFilter = screen.getByLabelText('Role Filter:');
      await fireEvent.change(roleFilter, { target: { value: 'admin' } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('role=admin'),
          expect.any(Object)
        );
      });
    });

    it('should show create user form when button clicked', async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 5, total: 0, totalPages: 0 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(UsersList);

      const addButton = await screen.findByText('Add User');
      await fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create New User')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument();
      });
    });

    it('should handle user creation', async () => {
      const mockListResponse = {
        data: [],
        meta: { page: 1, limit: 5, total: 0, totalPages: 0 }
      };

      const mockCreateResponse = {
        id: 3,
        name: 'New User',
        email: 'new@example.com',
        username: 'newuser',
        role: 'user',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z'
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockListResponse,
          headers: new Headers({ 'content-type': 'application/json' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCreateResponse,
          headers: new Headers({ 'content-type': 'application/json' })
        });

      render(UsersList);

      // Open create form
      const addButton = await screen.findByText('Add User');
      await fireEvent.click(addButton);

      // Fill form
      const nameInput = screen.getByPlaceholderText('Full name');
      const emailInput = screen.getByPlaceholderText('email@example.com');
      const usernameInput = screen.getByPlaceholderText('username');

      await fireEvent.input(nameInput, { target: { value: 'New User' } });
      await fireEvent.input(emailInput, { target: { value: 'new@example.com' } });
      await fireEvent.input(usernameInput, { target: { value: 'newuser' } });

      // Submit form
      const createButton = screen.getByText('Create User');
      await fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              name: 'New User',
              email: 'new@example.com',
              username: 'newuser',
              role: 'user',
              bio: ''
            })
          })
        );
      });
    });
  });

  describe('PostsList Component', () => {
    it('should render loading state initially', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(PostsList);

      await waitFor(() => {
        expect(screen.getByText('Loading posts...')).toBeInTheDocument();
      });
    });

    it('should render posts after loading', async () => {
      const mockResponse = {
        data: mockPosts,
        meta: {
          page: 1,
          limit: 3,
          total: 2,
          totalPages: 1
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(PostsList);

      await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument();
        expect(screen.getByText('Second Post')).toBeInTheDocument();
        expect(screen.getByText('by John Doe')).toBeInTheDocument();
        expect(screen.getByText('by Jane Smith')).toBeInTheDocument();
      });
    });

    it('should show published and draft badges correctly', async () => {
      const mockResponse = {
        data: mockPosts,
        meta: {
          page: 1,
          limit: 3,
          total: 2,
          totalPages: 1
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(PostsList);

      await waitFor(() => {
        expect(screen.getByText('Published')).toBeInTheDocument();
        expect(screen.getByText('Draft')).toBeInTheDocument();
        expect(screen.getByText('Featured')).toBeInTheDocument();
      });
    });

    it('should display tags correctly', async () => {
      const mockResponse = {
        data: mockPosts,
        meta: {
          page: 1,
          limit: 3,
          total: 2,
          totalPages: 1
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(PostsList);

      await waitFor(() => {
        expect(screen.getByText('svelte')).toBeInTheDocument();
        expect(screen.getByText('redux')).toBeInTheDocument();
        expect(screen.getByText('api')).toBeInTheDocument();
        expect(screen.getByText('testing')).toBeInTheDocument();
      });
    });

    it('should handle status filter changes', async () => {
      const mockResponse = {
        data: mockPosts.filter(p => p.published),
        meta: {
          page: 1,
          limit: 3,
          total: 1,
          totalPages: 1
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(PostsList);

      const statusFilter = screen.getByLabelText('Status Filter:');
      await fireEvent.change(statusFilter, { target: { value: 'published' } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('published=true'),
          expect.any(Object)
        );
      });
    });

    it('should show create post form when button clicked', async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 3, total: 0, totalPages: 0 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(PostsList);

      const createButton = await screen.findByText('Create Post');
      await fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create New Post')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Post title')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Post content')).toBeInTheDocument();
      });
    });

    it('should handle tag addition in create form', async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 3, total: 0, totalPages: 0 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(PostsList);

      // Open create form
      const createButton = await screen.findByText('Create Post');
      await fireEvent.click(createButton);

      // Add a tag
      const tagInput = screen.getByPlaceholderText('Add a tag');
      await fireEvent.input(tagInput, { target: { value: 'newtag' } });
      
      const addTagButton = screen.getByText('Add Tag');
      await fireEvent.click(addTagButton);

      await waitFor(() => {
        expect(screen.getByText('newtag')).toBeInTheDocument();
      });
    });

    it('should handle post publishing toggle', async () => {
      const mockListResponse = {
        data: mockPosts,
        meta: { page: 1, limit: 3, total: 2, totalPages: 1 }
      };

      const mockUpdateResponse = {
        ...mockPosts[1],
        published: true,
        updatedAt: new Date().toISOString()
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockListResponse,
          headers: new Headers({ 'content-type': 'application/json' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUpdateResponse,
          headers: new Headers({ 'content-type': 'application/json' })
        });

      render(PostsList);

      await waitFor(() => {
        expect(screen.getByText('Second Post')).toBeInTheDocument();
      });

      // Find and click publish button for draft post
      const publishButton = screen.getByText('Publish');
      await fireEvent.click(publishButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/posts/2',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"published":true')
          })
        );
      });
    });

    it('should handle post deletion', async () => {
      const mockListResponse = {
        data: mockPosts,
        meta: { page: 1, limit: 3, total: 2, totalPages: 1 }
      };

      const mockDeleteResponse = {
        message: 'Post deleted',
        post: mockPosts[0]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockListResponse,
          headers: new Headers({ 'content-type': 'application/json' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDeleteResponse,
          headers: new Headers({ 'content-type': 'application/json' })
        });

      render(PostsList);

      await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument();
      });

      // Find and click delete button
      const deleteButtons = screen.getAllByText('Delete');
      await fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/posts/1',
          expect.objectContaining({
            method: 'DELETE'
          })
        );
      });
    });
  });

  describe('Component Error Handling', () => {
    it('should handle UsersList API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(UsersList);

      await waitFor(() => {
        expect(screen.getByText(/Error loading users/)).toBeInTheDocument();
      });
    });

    it('should handle PostsList API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(PostsList);

      await waitFor(() => {
        expect(screen.getByText(/Error loading posts/)).toBeInTheDocument();
      });
    });

    it('should show loading states during mutations', async () => {
      const mockListResponse = {
        data: mockUsers,
        meta: { page: 1, limit: 5, total: 2, totalPages: 1 }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockListResponse,
          headers: new Headers({ 'content-type': 'application/json' })
        })
        .mockImplementationOnce(() => new Promise(() => {})); // Never resolves for delete

      render(UsersList);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByText('Delete');
      await fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Deleting...')).toBeInTheDocument();
      });
    });
  });

  describe('Component State Management', () => {
    it('should handle form validation in UsersList', async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 5, total: 0, totalPages: 0 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(UsersList);

      // Open create form
      const addButton = await screen.findByText('Add User');
      await fireEvent.click(addButton);

      // Try to submit with empty fields
      const createButton = screen.getByText('Create User');
      expect(createButton).toBeDisabled();

      // Fill required fields
      const nameInput = screen.getByPlaceholderText('Full name');
      const emailInput = screen.getByPlaceholderText('email@example.com');
      const usernameInput = screen.getByPlaceholderText('username');

      await fireEvent.input(nameInput, { target: { value: 'Test' } });
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.input(usernameInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(createButton).not.toBeDisabled();
      });
    });

    it('should handle form validation in PostsList', async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 3, total: 0, totalPages: 0 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      render(PostsList);

      // Open create form
      const createButton = await screen.findByText('Create Post');
      await fireEvent.click(createButton);

      // Try to submit with empty fields
      const submitButton = screen.getByText('Create Post');
      expect(submitButton).toBeDisabled();

      // Fill required fields
      const titleInput = screen.getByPlaceholderText('Post title');
      const contentInput = screen.getByPlaceholderText('Post content');

      await fireEvent.input(titleInput, { target: { value: 'Test Post' } });
      await fireEvent.input(contentInput, { target: { value: 'Test content' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});