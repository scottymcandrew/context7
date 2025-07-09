import {
  SearchResponse,
  CloudProviderSearchRequest,
  CloudProviderSearchResponse,
  CloudProviderContent,
  CloudProvider,
  GuideType,
  TroubleshootingCategory,
  ContentSection,
} from "./types.js";
import { extractTroubleshootingSteps, extractCodeExamples, cleanHtmlContent } from "./utils.js";

const CONTEXT7_API_BASE_URL = "https://context7.com/api";
const DEFAULT_TYPE = "txt";

// AWS Documentation constants
const AWS_DOCS_BASE_URL = "https://docs.aws.amazon.com";

// Service URL patterns for AWS
const AWS_SERVICE_PATTERNS = {
  iam: "/IAM/latest/UserGuide/",
  s3: "/AmazonS3/latest/userguide/",
  lambda: "/lambda/latest/dg/",
  apigateway: "/apigateway/latest/developerguide/",
  cloudwatch: "/AmazonCloudWatch/latest/",
  ec2: "/AWSEC2/latest/UserGuide/",
  rds: "/AmazonRDS/latest/UserGuide/",
  dynamodb: "/amazondynamodb/latest/developerguide/",
};

// Cache for sitemap and content
const contentCache = new Map<string, { content: CloudProviderContent; timestamp: number }>();
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Searches for libraries matching the given query
 * @param query The search query
 * @returns Search results or null if the request fails
 */
export async function searchLibraries(query: string): Promise<SearchResponse> {
  try {
    const url = new URL(`${CONTEXT7_API_BASE_URL}/v1/search`);
    url.searchParams.set("query", query);
    const response = await fetch(url);
    if (!response.ok) {
      const errorCode = response.status;
      if (errorCode === 429) {
        console.error(`Rate limited due to too many requests. Please try again later.`);
        return {
          results: [],
          error: `Rate limited due to too many requests. Please try again later.`,
        } as SearchResponse;
      }
      console.error(`Failed to search libraries. Please try again later. Error code: ${errorCode}`);
      return {
        results: [],
        error: `Failed to search libraries. Please try again later. Error code: ${errorCode}`,
      } as SearchResponse;
    }
    return await response.json();
  } catch (error) {
    console.error("Error searching libraries:", error);
    return { results: [], error: `Error searching libraries: ${error}` } as SearchResponse;
  }
}

/**
 * Fetches documentation context for a specific library
 * @param libraryId The library ID to fetch documentation for
 * @param options Options for the request
 * @returns The documentation text or null if the request fails
 */
export async function fetchLibraryDocumentation(
  libraryId: string,
  options: {
    tokens?: number;
    topic?: string;
  } = {}
): Promise<string | null> {
  try {
    if (libraryId.startsWith("/")) {
      libraryId = libraryId.slice(1);
    }
    const url = new URL(`${CONTEXT7_API_BASE_URL}/v1/${libraryId}`);
    if (options.tokens) url.searchParams.set("tokens", options.tokens.toString());
    if (options.topic) url.searchParams.set("topic", options.topic);
    url.searchParams.set("type", DEFAULT_TYPE);
    const response = await fetch(url, {
      headers: {
        "X-Context7-Source": "mcp-server",
      },
    });
    if (!response.ok) {
      const errorCode = response.status;
      if (errorCode === 429) {
        const errorMessage = `Rate limited due to too many requests. Please try again later.`;
        console.error(errorMessage);
        return errorMessage;
      }
      const errorMessage = `Failed to fetch documentation. Please try again later. Error code: ${errorCode}`;
      console.error(errorMessage);
      return errorMessage;
    }
    const text = await response.text();
    if (!text || text === "No content available" || text === "No context data available") {
      return null;
    }
    return text;
  } catch (error) {
    const errorMessage = `Error fetching library documentation. Please try again later. ${error}`;
    console.error(errorMessage);
    return errorMessage;
  }
}

/**
 * Searches for cloud provider documentation based on the search request
 * @param searchRequest The search parameters
 * @returns Search results or error
 */
export async function searchCloudProviderDocs(
  searchRequest: CloudProviderSearchRequest
): Promise<CloudProviderSearchResponse> {
  const startTime = Date.now();

  try {
    if (searchRequest.provider === CloudProvider.AWS) {
      return await searchAwsDocs(searchRequest, startTime);
    } else {
      return {
        results: [],
        totalResults: 0,
        searchTime: Date.now() - startTime,
        error: `Provider ${searchRequest.provider} not yet supported`,
      };
    }
  } catch (error) {
    console.error("Error searching cloud provider docs:", error);
    return {
      results: [],
      totalResults: 0,
      searchTime: Date.now() - startTime,
      error: `Error searching cloud provider documentation: ${error}`,
    };
  }
}

/**
 * Searches AWS documentation specifically
 * @param searchRequest The search parameters
 * @param startTime Start time for performance tracking
 * @returns AWS documentation search results
 */
async function searchAwsDocs(
  searchRequest: CloudProviderSearchRequest,
  startTime: number
): Promise<CloudProviderSearchResponse> {
  const results: CloudProviderContent[] = [];
  const maxResults = searchRequest.maxResults || 10;

  // Determine which services to search
  const servicesToSearch = searchRequest.service
    ? [searchRequest.service.toLowerCase()]
    : Object.keys(AWS_SERVICE_PATTERNS);

  for (const service of servicesToSearch) {
    if (results.length >= maxResults) break;

    const servicePattern = AWS_SERVICE_PATTERNS[service as keyof typeof AWS_SERVICE_PATTERNS];
    if (!servicePattern) continue;

    try {
      const serviceDocs = await searchServiceDocs(
        service,
        servicePattern,
        searchRequest.query,
        searchRequest.category
      );
      results.push(...serviceDocs.slice(0, maxResults - results.length));
    } catch (error) {
      console.warn(`Failed to search ${service} docs:`, error);
    }
  }

  return {
    results,
    totalResults: results.length,
    searchTime: Date.now() - startTime,
  };
}

/**
 * Searches documentation for a specific AWS service
 * @param service The AWS service name
 * @param servicePattern The URL pattern for the service
 * @param query The search query
 * @param category Optional troubleshooting category filter
 * @returns Array of matching content
 */
async function searchServiceDocs(
  service: string,
  servicePattern: string,
  query: string,
  category?: TroubleshootingCategory
): Promise<CloudProviderContent[]> {
  const results: CloudProviderContent[] = [];

  // For now, we'll search common troubleshooting pages
  const troubleshootingPages = await getTroubleshootingUrls(service, servicePattern);

  for (const pageUrl of troubleshootingPages) {
    try {
      const content = await fetchAwsDocContent(pageUrl);
      if (content && contentMatchesQuery(content, query, category)) {
        results.push(content);
      }
    } catch (error) {
      console.warn(`Failed to fetch content from ${pageUrl}:`, error);
    }
  }

  return results;
}

/**
 * Gets troubleshooting URLs for a specific AWS service
 * @param service The service name
 * @param servicePattern The base URL pattern
 * @returns Array of troubleshooting page URLs
 */
async function getTroubleshootingUrls(service: string, servicePattern: string): Promise<string[]> {
  const baseUrl = `${AWS_DOCS_BASE_URL}${servicePattern}`;

  // Common troubleshooting page patterns
  const troubleshootingPatterns = [
    "troubleshoot.html",
    "troubleshoot-access-denied.html",
    "troubleshoot-policies.html",
    "troubleshoot-roles.html",
    "security_iam_troubleshoot.html",
    "troubleshoot-403-errors.html",
    "troubleshoot-permissions.html",
  ];

  const urls: string[] = [];

  for (const pattern of troubleshootingPatterns) {
    const url = `${baseUrl}${pattern}`;
    // We'll add the URL optimistically - fetchAwsDocContent will handle 404s
    urls.push(url);
  }

  return urls;
}

/**
 * Fetches and parses AWS documentation content from a URL
 * @param url The documentation URL
 * @returns Parsed content or null if not found
 */
async function fetchAwsDocContent(url: string): Promise<CloudProviderContent | null> {
  // Check cache first
  const cached = contentCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Context7-MCP-Server/1.0.0",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Page doesn't exist
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const content = parseAwsDocumentationHtml(html, url);

    if (content) {
      // Cache the content
      contentCache.set(url, { content, timestamp: Date.now() });
    }

    return content;
  } catch (error) {
    console.warn(`Failed to fetch AWS documentation from ${url}:`, error);
    return null;
  }
}

/**
 * Parses AWS documentation HTML into structured content
 * @param html The HTML content
 * @param url The source URL
 * @returns Parsed CloudProviderContent
 */
function parseAwsDocumentationHtml(html: string, url: string): CloudProviderContent | null {
  try {
    // Simple HTML parsing - in a real implementation, you'd use a proper HTML parser
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].replace(" - Amazon Web Services", "").trim()
      : "AWS Documentation";

    const descriptionMatch = html.match(/<meta name="description" content="([^"]+)"/i);
    const description = descriptionMatch ? descriptionMatch[1] : "";

    const keywordsMatch = html.match(/<meta name="keywords" content="([^"]+)"/i);
    const keywords = keywordsMatch ? keywordsMatch[1].split(",").map((k) => k.trim()) : [];

    // Extract service from URL
    const serviceMatch = url.match(/docs\.aws\.amazon\.com\/([^\/]+)/);
    let service = serviceMatch ? serviceMatch[1] : "aws";

    // Map common service names
    const serviceMapping: { [key: string]: string } = {
      IAM: "iam",
      AmazonS3: "s3",
      lambda: "lambda",
      apigateway: "api-gateway",
      AmazonCloudWatch: "cloudwatch",
    };
    service = serviceMapping[service] || service.toLowerCase();

    // Determine category based on URL and title
    let category = TroubleshootingCategory.GENERAL;
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    if (urlLower.includes("access-denied") || titleLower.includes("access denied")) {
      category = TroubleshootingCategory.ACCESS_DENIED;
    } else if (urlLower.includes("permission") || titleLower.includes("permission")) {
      category = TroubleshootingCategory.PERMISSIONS;
    } else if (urlLower.includes("auth") || titleLower.includes("auth")) {
      category = TroubleshootingCategory.AUTHENTICATION;
    } else if (urlLower.includes("config") || titleLower.includes("config")) {
      category = TroubleshootingCategory.CONFIGURATION;
    }

    // Extract main content (simplified)
    const contentMatch = html.match(/<div[^>]*id="main-content"[^>]*>(.*?)<\/div>/s);
    const mainContent = contentMatch ? contentMatch[1] : html;

    // Extract sections with more sophisticated parsing
    const sections: ContentSection[] = [];
    const headingMatches = mainContent.matchAll(/<h([1-6])[^>]*[^>]*>([^<]+)<\/h[1-6]>/g);

    let sectionIndex = 0;
    for (const match of headingMatches) {
      const level = parseInt(match[1]);
      const heading = match[2].trim();

      // Try to extract content for this section
      const sectionContentRegex = new RegExp(
        `<h${level}[^>]*>${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h${level}>(.*?)(?=<h[1-${level}]|$)`,
        "s"
      );
      const sectionContentMatch = mainContent.match(sectionContentRegex);
      const sectionContent = sectionContentMatch ? cleanHtmlContent(sectionContentMatch[1]) : "";

      sections.push({
        id: `section-${sectionIndex++}`,
        heading,
        content: sectionContent,
        level,
      });
    }

    // Extract troubleshooting steps and code examples using utility functions
    const troubleshootingSteps = extractTroubleshootingSteps(mainContent);
    const codeExamples = extractCodeExamples(mainContent);

    return {
      title,
      service,
      provider: CloudProvider.AWS,
      guideType: GuideType.USER_GUIDE, // Could be determined from URL
      url,
      description,
      keywords,
      content: {
        sections,
        troubleshootingSteps,
        codeExamples,
      },
      breadcrumbs: [], // Would extract from navigation
      relatedLinks: [], // Would extract from content
      lastUpdated: new Date().toISOString(),
      category,
    };
  } catch (error) {
    console.error("Error parsing AWS documentation HTML:", error);
    return null;
  }
}

/**
 * Checks if content matches the search query and category
 * @param content The content to check
 * @param query The search query
 * @param category Optional category filter
 * @returns True if content matches
 */
function contentMatchesQuery(
  content: CloudProviderContent,
  query: string,
  category?: TroubleshootingCategory
): boolean {
  const queryLower = query.toLowerCase();

  // Check category filter
  if (category && content.category !== category) {
    return false;
  }

  // Check if query matches title, description, or keywords
  const titleMatch = content.title.toLowerCase().includes(queryLower);
  const descriptionMatch = content.description.toLowerCase().includes(queryLower);
  const keywordMatch = content.keywords.some((keyword) =>
    keyword.toLowerCase().includes(queryLower)
  );

  return titleMatch || descriptionMatch || keywordMatch;
}
