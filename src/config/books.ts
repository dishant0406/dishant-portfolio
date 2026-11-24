import config from "@/config/config.json";
import type { Book } from "@/config/types";

export const bookshelfConfig = {
  title: config.bookshelf.title,
  href: "/#bookshelf",
  defaultBookId: config.bookshelf.defaultBookId,
  coverUnavailable: "Cover unavailable",
  empty: "More books will find their way here.",
};

export const booksConfig = config.bookshelf.items as Book[];
