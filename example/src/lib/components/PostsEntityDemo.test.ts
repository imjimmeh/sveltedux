import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { createStore } from '../../../../library/src/lib/store.svelte.js';
import { combineReducers } from '../../../../library/src/lib/reducers.js';
import { applyMiddleware } from '../../../../library/src/lib/middleware.js';
import { api } from '../api/index.js';
import PostsEntityDemo from './PostsEntityDemo.svelte';
import type { Post } from '$lib/types.js';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock data
const mockPosts: Post[] = [
  {
    id: 1,
    title: "Getting Started with SvelteDux",
    content: "SvelteDux provides a powerful state management solution for Svelte applications...",
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
    content: "Explore advanced patterns for API integration using SvelteDux query functionality...",
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
    content: "Best practices for managing normalized data using entity adapters...",
    excerpt: "Efficient entity state management patterns",
    authorId: 3,
    authorName: "Bob Wilson",
    tags: ["entities", "normalization", "patterns"],
    published: false,
    featured: true,
    createdAt: "2024-01-03T09:15:00Z",
    updatedAt: "2024-01-03T09:15:00Z",
  }
];

describe('PostsEntityDemo Component', () => {
  let testStore: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create fresh store for each test
    testStore = createStore(
      combineReducers({
        [api.reducerPath]: api.reducer,
        posts: (state = { ids: [], entities: {}, loading: false, error: null, lastFetch: null, filter: {} }, action) => state
      }), 
      undefined, 
      applyMiddleware(api.middleware)
    );
    
    // Mock successful API response
    const mockResponse = {
      data: mockPosts,
      meta: {
        total: mockPosts.length,
        totalPages: 1,
        currentPage: 1,
        perPage: 50,
      }
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      headers: new Headers({ 'content-type': 'application/json' })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Loading and Display', () => {
    it('should render loading state initially', async () => {
      // Mock slow API response
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(PostsEntityDemo);

      await waitFor(() => {
        expect(screen.getByText('Loading posts...')).toBeInTheDocument();
      });
    });

    it('should display posts after loading', async () => {
      render(PostsEntityDemo);

      await waitFor(() => {
        expect(screen.getByText('Getting Started with SvelteDux')).toBeInTheDocument();
        expect(screen.getByText('Advanced API Patterns')).toBeInTheDocument();
        expect(screen.getByText('Entity Management Best Practices')).toBeInTheDocument();
      });
    });

    it('should display entity adapter statistics', async () => {
      render(PostsEntityDemo);

      await waitFor(() => {
        // Should show statistics from entity adapter selectors
        expect(screen.getByText(/Total Posts:/)).toBeInTheDocument();
        expect(screen.getByText(/Published:/)).toBeInTheDocument();
        expect(screen.getByText(/Drafts:/)).toBeInTheDocument();
        expect(screen.getByText(/Featured:/)).toBeInTheDocument();
      });
    });

    it('should display authors and tags from posts', async () => {
      render(PostsEntityDemo);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
        
        expect(screen.getByText('svelte')).toBeInTheDocument();
        expect(screen.getByText('api')).toBeInTheDocument();
        expect(screen.getByText('entities')).toBeInTheDocument();
      });
    });
  });

  describe('Entity Adapter Integration', () => {
    it('should use entity adapter selectors for data display', async () => {
      // Mock selectors to return specific data
      const selectors = {
        posts: {
          selectAllPosts: vi.fn(() => mockPosts),
          selectFilteredPosts: vi.fn(() => mockPosts),
          selectPostsStats: vi.fn(() => ({
            total: 3,
            published: 2,
            drafts: 1,
            featured: 2
          })),
          selectAuthorsFromPosts: vi.fn(() => [
            { id: 1, name: 'John Doe' },
            { id: 2, name: 'Jane Smith' },
            { id: 3, name: 'Bob Wilson' }
          ]),
          selectTagsFromPosts: vi.fn(() => [
            { name: 'svelte', count: 1, lastUsed: '2024-01-01T10:00:00Z' },
            { name: 'api', count: 1, lastUsed: '2024-01-02T14:30:00Z' },
            { name: 'entities', count: 1, lastUsed: '2024-01-03T09:15:00Z' }
          ]),
          selectRecentPosts: vi.fn(() => mockPosts.slice(0, 2)),
        }
      };
      
      // Mock the store module
      vi.doMock('../store/index.js', () => ({
        store: testStore,
        selectors,
        actions: {
          posts: {
            setPosts: vi.fn((posts: Post[]) => ({ type: 'posts/setPosts', payload: posts })),
            setPostsFilter: vi.fn((filter: any) => ({ type: 'posts/setPostsFilter', payload: filter })),
          }
        }
      }));

      render(PostsEntityDemo);

      await waitFor(() => {
        expect(selectors.posts.selectAllPosts).toHaveBeenCalled();
        expect(selectors.posts.selectFilteredPosts).toHaveBeenCalled();
        expect(selectors.posts.selectPostsStats).toHaveBeenCalled();
        expect(selectors.posts.selectAuthorsFromPosts).toHaveBeenCalled();
      });
    });

    it('should dispatch setPosts action when API data loads', async () => {
      const actions = {
        posts: {
          setPosts: vi.fn((posts: Post[]) => ({ type: 'posts/setPosts', payload: posts })),
          setPostsFilter: vi.fn((filter: any) => ({ type: 'posts/setPostsFilter', payload: filter })),
        }
      };

      // Mock the store module
      vi.doMock('../store/index.js', () => ({
        store: testStore,
        selectors: {
          posts: {
            selectAllPosts: vi.fn(() => []),
            selectFilteredPosts: vi.fn(() => []),
            selectPostsStats: vi.fn(() => ({ total: 0, published: 0, drafts: 0, featured: 0 })),
            selectAuthorsFromPosts: vi.fn(() => []),
            selectTagsFromPosts: vi.fn(() => []),
            selectRecentPosts: vi.fn(() => []),
          }
        },
        actions
      }));

      render(PostsEntityDemo);

      await waitFor(() => {
        expect(actions.posts.setPosts).toHaveBeenCalledWith(mockPosts);
      });
    });
  });

  describe('Filtering and Search', () => {
    beforeEach(() => {
      const selectors = {
        posts: {
          selectAllPosts: vi.fn(() => mockPosts),
          selectFilteredPosts: vi.fn(() => mockPosts),
          selectAuthorsFromPosts: vi.fn(() => [
            { id: 1, name: 'John Doe' },
            { id: 2, name: 'Jane Smith' },
            { id: 3, name: 'Bob Wilson' }
          ]),
          selectTagsFromPosts: vi.fn(() => [
            'svelte', 'api', 'entities', 'redux', 'async', 'caching'
          ]),
          selectPostsStats: vi.fn(() => ({ total: 3, published: 2, drafts: 1, featured: 2 })),
          selectRecentPosts: vi.fn(() => mockPosts.slice(0, 2)),
        }
      };
      
      vi.doMock('../store/index.js', () => ({
        store: testStore,
        selectors,
        actions: {
          posts: {
            setPosts: vi.fn((posts: Post[]) => ({ type: 'posts/setPosts', payload: posts })),
            setPostsFilter: vi.fn((filter: any) => ({ type: 'posts/setPostsFilter', payload: filter })),
          }
        }
      }));
    });

    it('should handle author filter changes', async () => {
      render(PostsEntityDemo);

      const authorSelect = await screen.findByLabelText('Author:');
      await fireEvent.change(authorSelect, { target: { value: '1' } });

      const applyButton = screen.getByText('Apply Filters');
      await fireEvent.click(applyButton);

      const actions = {
        posts: {
          setPostsFilter: vi.fn((filter: any) => ({ type: 'posts/setPostsFilter', payload: filter })),
        }
      };
      
      vi.doMock('../store/index.js', () => ({
        store: testStore,
        selectors: {},
        actions
      }));
      
      expect(actions.posts.setPostsFilter).toHaveBeenCalledWith({
        authorId: 1,
        published: undefined,
        tag: undefined
      });
    });

    it('should handle published filter changes', async () => {
      render(PostsEntityDemo);

      const publishedSelect = await screen.findByLabelText('Status:');
      await fireEvent.change(publishedSelect, { target: { value: 'true' } });

      const applyButton = screen.getByText('Apply Filters');
      await fireEvent.click(applyButton);

      const actions = {
        posts: {
          setPostsFilter: vi.fn((filter: any) => ({ type: 'posts/setPostsFilter', payload: filter })),
        }
      };
      
      vi.doMock('../store/index.js', () => ({
        store: testStore,
        selectors: {},
        actions
      }));
      
      expect(actions.posts.setPostsFilter).toHaveBeenCalledWith({
        authorId: undefined,
        published: true,
        tag: undefined
      });
    });

    it('should handle tag filter changes', async () => {
      render(PostsEntityDemo);

      const tagSelect = await screen.findByLabelText('Tag:');
      await fireEvent.change(tagSelect, { target: { value: 'svelte' } });

      const applyButton = screen.getByText('Apply Filters');
      await fireEvent.click(applyButton);

      const actions = {
        posts: {
          setPostsFilter: vi.fn((filter: any) => ({ type: 'posts/setPostsFilter', payload: filter })),
        }
      };
      
      vi.doMock('../store/index.js', () => ({
        store: testStore,
        selectors: {},
        actions
      }));
      
      expect(actions.posts.setPostsFilter).toHaveBeenCalledWith({
        authorId: undefined,
        published: undefined,
        tag: 'svelte'
      });
    });

    it('should clear all filters when clear button clicked', async () => {
      render(PostsEntityDemo);

      const clearButton = await screen.findByText('Clear');
      await fireEvent.click(clearButton);

      const actions = {
        posts: {
          setPostsFilter: vi.fn((filter: any) => ({ type: 'posts/setPostsFilter', payload: filter })),
        }
      };
      
      vi.doMock('../store/index.js', () => ({
        store: testStore,
        selectors: {},
        actions
      }));
      
      expect(actions.posts.setPostsFilter).toHaveBeenCalledWith({});
    });
  });

  describe('CRUD Operations', () => {
    it('should show create post form when button clicked', async () => {
      render(PostsEntityDemo);

      const createButton = await screen.findByText('Create Post (Optimistic)');
      await fireEvent.click(createButton);

      expect(screen.getByPlaceholderText('Enter post title')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter post content')).toBeInTheDocument();
    });

    it('should handle post creation', async () => {
      const mockCreateResponse = {
        id: 4,
        title: 'New Test Post',
        content: 'Test content',
        excerpt: 'Test content...',
        authorId: 1,
        authorName: 'John Doe',
        tags: ['demo', 'entity-adapter'],
        published: false,
        featured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockPosts, meta: { total: 3, totalPages: 1, currentPage: 1, perPage: 50 } }),
          headers: new Headers({ 'content-type': 'application/json' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCreateResponse,
          headers: new Headers({ 'content-type': 'application/json' })
        });

      render(PostsEntityDemo);

      // Open create form
      const createButton = await screen.findByText('Create Post (Optimistic)');
      await fireEvent.click(createButton);

      // Fill form
      const titleInput = screen.getByPlaceholderText('Enter post title');
      const contentInput = screen.getByPlaceholderText('Enter post content');

      await fireEvent.input(titleInput, { target: { value: 'New Test Post' } });
      await fireEvent.input(contentInput, { target: { value: 'Test content' } });

      // Submit form
      const submitButton = screen.getByText('Create Post');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/posts',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              title: 'New Test Post',
              content: 'Test content',
              excerpt: 'Test content...',
              authorId: 1,
              authorName: 'John Doe',
              tags: ['demo', 'entity-adapter'],
              published: false,
              featured: false
            })
          })
        );
      });
    });

    it('should validate form fields before allowing submission', async () => {
      render(PostsEntityDemo);

      // Open create form
      const createButton = await screen.findByText('Create Post (Optimistic)');
      await fireEvent.click(createButton);

      const submitButton = screen.getByText('Create Post');
      expect(submitButton).toBeDisabled();

      // Fill only title
      const titleInput = screen.getByPlaceholderText('Enter post title');
      await fireEvent.input(titleInput, { target: { value: 'Test Title' } });

      expect(submitButton).toBeDisabled();

      // Fill content
      const contentInput = screen.getByPlaceholderText('Enter post content');
      await fireEvent.input(contentInput, { target: { value: 'Test content' } });

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(PostsEntityDemo);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });

    it('should handle create post errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [], meta: { total: 0, totalPages: 0, currentPage: 1, perPage: 50 } }),
          headers: new Headers({ 'content-type': 'application/json' })
        })
        .mockRejectedValueOnce(new Error('Create failed'));

      render(PostsEntityDemo);

      // Open create form and submit
      const createButton = await screen.findByText('Create Post (Optimistic)');
      await fireEvent.click(createButton);

      const titleInput = screen.getByPlaceholderText('Enter post title');
      const contentInput = screen.getByPlaceholderText('Enter post content');

      await fireEvent.input(titleInput, { target: { value: 'Test' } });
      await fireEvent.input(contentInput, { target: { value: 'Test' } });

      const submitButton = screen.getByText('Create Post');
      await fireEvent.click(submitButton);

      // Should handle the error gracefully without crashing
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/posts', expect.any(Object));
      });
    });
  });

  describe('Performance and State Management', () => {
    it('should not cause infinite loading loops', async () => {
      let apiCallCount = 0;
      mockFetch.mockImplementation(() => {
        apiCallCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: mockPosts,
            meta: { total: mockPosts.length, totalPages: 1, currentPage: 1, perPage: 50 }
          }),
          headers: new Headers({ 'content-type': 'application/json' })
        });
      });

      render(PostsEntityDemo);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Getting Started with SvelteDux')).toBeInTheDocument();
      });

      // Wait a bit more to ensure no additional calls are made
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only make the initial API call, not infinite calls
      expect(apiCallCount).toBe(1);
    });

    it('should update entity adapter when new data loads', async () => {
      const actions = {
        posts: {
          setPosts: vi.fn((posts: Post[]) => ({ type: 'posts/setPosts', payload: posts })),
        }
      };
      
      vi.doMock('../store/index.js', () => ({
        store: testStore,
        selectors: {},
        actions
      }));

      render(PostsEntityDemo);

      await waitFor(() => {
        expect(actions.posts.setPosts).toHaveBeenCalledWith(mockPosts);
      });
    });
  });
});