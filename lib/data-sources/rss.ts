import {decodeXml, fetchWithTimeout, makeRawItem, stripTags} from "./common";
import type {OpportunitySource, RawExternalItem} from "@/lib/types";
import {extractKeywords} from "@/lib/opportunity/scoring";

export function parseRssItems(xml: string, source: OpportunitySource): RawExternalItem[] {
  const items = Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi)).slice(0, 12);
  return items.map((match) => {
    const item = match[0];
    const title = decodeXml(stripTags(item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "未命名新闻"));
    const summary = decodeXml(stripTags(item.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ?? ""));
    const url = decodeXml(stripTags(item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? ""));
    const publishedAt = decodeXml(stripTags(item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ?? ""));
    const rawContent = `${title}。${summary}`;
    return makeRawItem(source, {
      title: title.slice(0, 160),
      summary: summary.slice(0, 420),
      url,
      publishedAt,
      rawContent,
      detectedKeywords: extractKeywords(rawContent),
    });
  });
}

export async function fetchRssItems(source: OpportunitySource) {
  if (!source.enabled || !source.sourceUrl) return [];
  try {
    const response = await fetchWithTimeout(source.sourceUrl);
    if (!response.ok) return [];
    return parseRssItems(await response.text(), source);
  } catch {
    return [];
  }
}
