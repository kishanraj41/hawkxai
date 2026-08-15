import { z } from "zod";

export const platformSchema = z.enum(["x", "reddit", "hn"]);

export const postSchema = z.object({
  platform: platformSchema,
  title: z.string(),
  url: z.string(),
  score: z.number(),
  createdAt: z.string(),
});

export const platformSliceSchema = z.object({
  score: z.number(),
  posts: z.array(postSchema),
});

export const clusteredTopicSchema = z.object({
  id: z.string(),
  label: z.string(),
  platforms: z.object({
    x: platformSliceSchema,
    reddit: platformSliceSchema,
    hn: platformSliceSchema,
  }),
});

export const clusteredListSchema = z.object({
  topics: z.array(clusteredTopicSchema).min(1).max(24),
});

export const xTrendSchema = z.object({
  topic: z.string(),
  volume: z.number().min(0).max(100),
  urls: z.array(z.string()).max(3),
});

export const xTrendListSchema = z.object({
  topics: z.array(xTrendSchema).max(15),
});

export const tickerSchema = z.object({
  symbol: z.string(),
  sentiment: z.enum(["pos", "neg", "mixed"]),
  mentions: z.number(),
});

export const tickerListSchema = z.object({
  tickers: z.array(tickerSchema),
});
