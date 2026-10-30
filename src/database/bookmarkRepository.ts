import { Storage } from './storage';

const BOOKMARKS_KEY = '@english_formula_bookmarks';

export const BookmarkRepository = {
  async getBookmarks(): Promise<number[]> {
    try {
      const data = await Storage.getItem(BOOKMARKS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  async isBookmarked(id: number): Promise<boolean> {
    const list = await this.getBookmarks();
    return list.includes(id);
  },

  async toggleBookmark(id: number): Promise<boolean> {
    const list = await this.getBookmarks();
    const idx = list.indexOf(id);
    let newState = false;
    if (idx >= 0) {
      list.splice(idx, 1);
      newState = false;
    } else {
      list.push(id);
      newState = true;
    }
    await Storage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    return newState;
  },

  async clearBookmarks(): Promise<void> {
    await Storage.removeItem(BOOKMARKS_KEY);
  }
};
