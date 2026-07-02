import {defaultKeywords, fetchWithTimeout, makeRawItem, today} from "./common";
import type {OpportunitySource, RawExternalItem} from "@/lib/types";
import {extractKeywords} from "@/lib/opportunity/scoring";

type GdeltArticle = {
  title?: string;
  seendate?: string;
  url?: string;
  domain?: string;
  sourcecountry?: string;
};

export async function fetchGdeltItems(source: OpportunitySource): Promise<RawExternalItem[]> {
  if (!source.enabled) return [];
  const keywords = (source.keywords?.length ? source.keywords : defaultKeywords).slice(0, 8);
  const query = keywords.map((keyword) => `"${keyword}"`).join(" OR ");
  const url = new URL(source.sourceUrl || "https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "20");
  url.searchParams.set("sort", "hybridrel");
  try {
    const response = await fetchWithTimeout(url.toString(), 10000);
    if (!response.ok) return [];
    const payload = (await response.json()) as {articles?: GdeltArticle[]};
    return (payload.articles ?? []).slice(0, 12).map((article) => {
      const title = article.title || "未命名 GDELT 新闻";
      const summary = [article.domain, article.sourcecountry, article.seendate].filter(Boolean).join(" · ");
      const rawContent = `${title}。${summary}`;
      return makeRawItem(source, {
        title: title.slice(0, 160),
        summary,
        url: article.url,
        publishedAt: article.seendate || today(),
        rawContent,
        detectedKeywords: extractKeywords(rawContent),
      });
    });
  } catch {
    return [];
  }
}
