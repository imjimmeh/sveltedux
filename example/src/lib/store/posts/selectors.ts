import { createSelector } from "sveltedux";
import { postsAdapter } from "./slice.js";
import type { AppState } from "../types.js";

// Base selector to get posts slice
const selectPostsState = (state: AppState) => state.posts;

// Entity adapter selectors
export const selectAllPosts = createSelector(
  selectPostsState,
  postsAdapter.selectAll
);
export const selectPostEntities = createSelector(
  selectPostsState,
  postsAdapter.selectEntities
);
export const selectPostIds = createSelector(
  selectPostsState,
  postsAdapter.selectIds
);
export const selectTotalPosts = createSelector(
  selectPostsState,
  postsAdapter.selectTotal
);

// Individual post selector
export const selectPostById = (state: AppState, postId: number) =>
  postsAdapter.selectById(selectPostsState(state), postId);

// Loading and error selectors
export const selectPostsLoading = createSelector(
  selectPostsState,
  (state) => state.loading
);
export const selectPostsError = createSelector(
  selectPostsState,
  (state) => state.error
);
export const selectPostsLastFetch = createSelector(
  selectPostsState,
  (state) => state.lastFetch
);

// Filter selectors
export const selectPostsFilter = createSelector(
  selectPostsState,
  (state) => state.filter
);

// Filtered posts selectors
export const selectPublishedPosts = createSelector(selectAllPosts, (posts) =>
  posts.filter((post) => post.published)
);

export const selectDraftPosts = createSelector(selectAllPosts, (posts) =>
  posts.filter((post) => !post.published)
);

export const selectFeaturedPosts = createSelector(selectAllPosts, (posts) =>
  posts.filter((post) => post.featured)
);

export const selectPostsByAuthor = createSelector(
  selectAllPosts,
  (_: AppState, authorId: number) => authorId,
  (posts, authorId) => posts.filter((post) => post.authorId === authorId)
);

export const selectPostsByTag = createSelector(
  selectAllPosts,
  (_: AppState, tag: string) => tag,
  (posts, tag) => posts.filter((post) => post.tags.includes(tag))
);

// Complex filtered posts based on current filter state
export const selectFilteredPosts = createSelector(
  selectAllPosts,
  selectPostsFilter,
  (posts, filter) => {
    let filteredPosts = posts;

    if (filter.published !== undefined) {
      filteredPosts = filteredPosts.filter(
        (post) => post.published === filter.published
      );
    }

    if (filter.authorId !== undefined) {
      filteredPosts = filteredPosts.filter(
        (post) => post.authorId === filter.authorId
      );
    }

    if (filter.tag !== undefined) {
      filteredPosts = filteredPosts.filter((post) =>
        post.tags.includes(filter.tag)
      );
    }

    return filteredPosts;
  }
);

// Statistics selectors
export const selectPostsStats = createSelector(
  selectAllPosts,
  (
    posts
  ): {
    total: number;
    published: number;
    drafts: number;
    featured: number;
  } => ({
    total: posts.length,
    published: posts.filter((post) => post.published).length,
    drafts: posts.filter((post) => !post.published).length,
    featured: posts.filter((post) => post.featured).length,
  })
);

// Authors selector (derived from posts)
export const selectAuthorsFromPosts = createSelector(
  selectAllPosts,
  (posts) => {
    const authorsMap = new Map();

    posts.forEach((post) => {
      if (!authorsMap.has(post.authorId)) {
        authorsMap.set(post.authorId, {
          id: post.authorId,
          name: post.authorName,
          postCount: 0,
          lastPostDate: post.createdAt,
        });
      }

      const author = authorsMap.get(post.authorId);
      author.postCount += 1;

      // Update last post date if this post is newer
      if (new Date(post.createdAt) > new Date(author.lastPostDate)) {
        author.lastPostDate = post.createdAt;
      }
    });

    return Array.from(authorsMap.values());
  }
);

// Tags selector (derived from posts)
export const selectTagsFromPosts = createSelector(selectAllPosts, (posts) => {
  const tagsMap = new Map();

  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      if (!tagsMap.has(tag)) {
        tagsMap.set(tag, { name: tag, count: 0, lastUsed: post.createdAt });
      }

      const tagData = tagsMap.get(tag);
      tagData.count += 1;

      // Update last used date if this post is newer
      if (new Date(post.createdAt) > new Date(tagData.lastUsed)) {
        tagData.lastUsed = post.createdAt;
      }
    });
  });

  return Array.from(tagsMap.values()).sort((a, b) => b.count - a.count);
});

// Recent posts (last 7 days)
export const selectRecentPosts = createSelector(selectAllPosts, (posts) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  return posts.filter((post) => new Date(post.createdAt) > weekAgo);
});

// Posts that need caching refresh (older than 5 minutes)
export const selectStalePostsCheck = createSelector(
  selectPostsLastFetch,
  (lastFetch) => {
    if (!lastFetch) return true;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return lastFetch < fiveMinutesAgo;
  }
);
