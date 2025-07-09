import {
  SearchResponse,
  SearchResult,
  CloudProviderContent,
  TroubleshootingStep,
  CodeExample,
} from "./types.js";

/**
 * Formats a search result into a human-readable string representation.
 * Only shows code snippet count and GitHub stars when available (not equal to -1).
 *
 * @param result The SearchResult object to format
 * @returns A formatted string with library information
 */
export function formatSearchResult(result: SearchResult): string {
  // Always include these basic details
  const formattedResult = [
    `- Title: ${result.title}`,
    `- Context7-compatible library ID: ${result.id}`,
    `- Description: ${result.description}`,
  ];

  // Only add code snippets count if it's a valid value
  if (result.totalSnippets !== -1 && result.totalSnippets !== undefined) {
    formattedResult.push(`- Code Snippets: ${result.totalSnippets}`);
  }

  // Only add trust score if it's a valid value
  if (result.trustScore !== -1 && result.trustScore !== undefined) {
    formattedResult.push(`- Trust Score: ${result.trustScore}`);
  }

  // Only add versions if it's a valid value
  if (result.versions !== undefined && result.versions.length > 0) {
    formattedResult.push(`- Versions: ${result.versions.join(", ")}`);
  }

  // Join all parts with newlines
  return formattedResult.join("\n");
}

/**
 * Formats a search response into a human-readable string representation.
 * Each result is formatted using formatSearchResult.
 *
 * @param searchResponse The SearchResponse object to format
 * @returns A formatted string with search results
 */
export function formatSearchResults(searchResponse: SearchResponse): string {
  if (!searchResponse.results || searchResponse.results.length === 0) {
    return "No documentation libraries found matching your query.";
  }

  const formattedResults = searchResponse.results.map(formatSearchResult);
  return formattedResults.join("\n----------\n");
}

/**
 * Extracts troubleshooting steps from HTML content
 * @param html The HTML content to parse
 * @returns Array of troubleshooting steps
 */
export function extractTroubleshootingSteps(html: string): TroubleshootingStep[] {
  const steps: TroubleshootingStep[] = [];

  // Look for ordered lists or numbered procedures
  const orderedListMatches = html.matchAll(/<ol[^>]*>(.*?)<\/ol>/gs);

  for (const listMatch of orderedListMatches) {
    const listContent = listMatch[1];
    const listItems = listContent.matchAll(/<li[^>]*>(.*?)<\/li>/gs);

    let stepNumber = 1;
    for (const itemMatch of listItems) {
      const itemContent = itemMatch[1];

      // Extract text content and remove HTML tags
      const cleanText = itemContent.replace(/<[^>]*>/g, "").trim();

      if (cleanText.length > 10) {
        // Only include substantial content
        steps.push({
          step: stepNumber++,
          title: cleanText.length > 100 ? cleanText.substring(0, 100) + "..." : cleanText,
          description: cleanText,
          codeExample: extractCodeFromText(itemContent),
          relatedErrors: extractErrorsFromText(cleanText),
        });
      }
    }
  }

  // Also look for procedural sections with headings
  const procedureMatches = html.matchAll(
    /<h[3-6][^>]*>.*?(?:step|procedure|process|solution).*?<\/h[3-6]>(.*?)(?=<h[1-6]|$)/gis
  );

  for (const procMatch of procedureMatches) {
    const content = procMatch[1];
    const cleanText = content.replace(/<[^>]*>/g, "").trim();

    if (cleanText.length > 20) {
      steps.push({
        step: steps.length + 1,
        title: `Troubleshooting Procedure`,
        description: cleanText.length > 500 ? cleanText.substring(0, 500) + "..." : cleanText,
        codeExample: extractCodeFromText(content),
        relatedErrors: extractErrorsFromText(cleanText),
      });
    }
  }

  return steps;
}

/**
 * Extracts code examples from HTML content
 * @param html The HTML content to parse
 * @returns Array of code examples
 */
export function extractCodeExamples(html: string): CodeExample[] {
  const examples: CodeExample[] = [];

  // Look for code blocks in <pre> tags
  const preMatches = html.matchAll(
    /<pre[^>]*(?:class="[^"]*lang-([^"]*)[^"]*")?[^>]*>(.*?)<\/pre>/gs
  );

  for (const match of preMatches) {
    const language = match[1] || "text";
    const code = match[2].replace(/<[^>]*>/g, "").trim();

    if (code.length > 5) {
      examples.push({
        language: mapLanguage(language),
        code,
        description: `Code example in ${language || "text"}`,
        filename: undefined,
      });
    }
  }

  // Look for inline code snippets
  const codeMatches = html.matchAll(/<code[^>]*>(.*?)<\/code>/gs);

  for (const match of codeMatches) {
    const code = match[1].replace(/<[^>]*>/g, "").trim();

    // Only include substantial code snippets
    if (code.length > 20 && !code.includes(" ") === false) {
      examples.push({
        language: detectLanguageFromCode(code),
        code,
        description: "Inline code snippet",
        filename: undefined,
      });
    }
  }

  return examples;
}

/**
 * Extracts error messages and codes from text content
 * @param text The text to search for errors
 * @returns Array of error strings
 */
export function extractErrorsFromText(text: string): string[] {
  const errors: string[] = [];

  // Common error patterns
  const errorPatterns = [
    /(?:error|exception|failure)[\s:]*([A-Z][A-Za-z0-9_]*(?:[A-Z][A-Za-z0-9_]*)*)/gi,
    /HTTP\s+(\d{3})\s+([A-Za-z\s]+)/gi,
    /AccessDenied|Forbidden|Unauthorized|InvalidRequest|BadRequest/gi,
    /([A-Z_][A-Z0-9_]*ERROR[A-Z0-9_]*)/gi,
  ];

  for (const pattern of errorPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const error = match[1] || match[0];
      if (error && !errors.includes(error)) {
        errors.push(error.trim());
      }
    }
  }

  return errors;
}

/**
 * Extracts code snippets from HTML content
 * @param html HTML content that may contain code
 * @returns Code string or undefined
 */
function extractCodeFromText(html: string): string | undefined {
  const codeMatch = html.match(/<code[^>]*>(.*?)<\/code>/s);
  if (codeMatch) {
    const code = codeMatch[1].replace(/<[^>]*>/g, "").trim();
    return code.length > 5 ? code : undefined;
  }

  const preMatch = html.match(/<pre[^>]*>(.*?)<\/pre>/s);
  if (preMatch) {
    const code = preMatch[1].replace(/<[^>]*>/g, "").trim();
    return code.length > 5 ? code : undefined;
  }

  return undefined;
}

/**
 * Maps common language identifiers to standard names
 * @param lang The language identifier from HTML
 * @returns Standardized language name
 */
function mapLanguage(lang: string): string {
  const languageMap: { [key: string]: string } = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    rb: "ruby",
    yml: "yaml",
    md: "markdown",
    sh: "bash",
    shell: "bash",
  };

  return languageMap[lang?.toLowerCase()] || lang || "text";
}

/**
 * Attempts to detect programming language from code content
 * @param code The code snippet
 * @returns Detected language
 */
function detectLanguageFromCode(code: string): string {
  // Simple heuristics for language detection
  if (code.includes("aws ") || code.includes("boto3") || code.includes("import boto")) {
    return "python";
  }
  if (code.includes("AWS.") || code.includes("aws-sdk")) {
    return "javascript";
  }
  if (code.includes("#!/bin/bash") || code.includes("curl ") || code.includes("aws ")) {
    return "bash";
  }
  if (code.includes("{") && code.includes("}") && code.includes('"')) {
    return "json";
  }
  if (code.includes("Version:") && code.includes("Statement:")) {
    return "json"; // Likely AWS policy
  }

  return "text";
}

/**
 * Cleans and formats HTML content for better readability
 * @param html The HTML content to clean
 * @returns Cleaned text content
 */
export function cleanHtmlContent(html: string): string {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, "") // Remove scripts
    .replace(/<style[^>]*>.*?<\/style>/gis, "") // Remove styles
    .replace(/<[^>]*>/g, " ") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\n\s*\n/g, "\n") // Remove empty lines
    .trim();
}

/**
 * Formats cloud provider content for display in MCP response
 * @param content The cloud provider content to format
 * @returns Formatted string for display
 */
export function formatCloudProviderContent(content: CloudProviderContent): string {
  const sections =
    content.content.sections.length > 0
      ? `\n\n**Key Sections:**\n${content.content.sections.map((s) => `- ${s.heading} (Level ${s.level})`).join("\n")}`
      : "";

  const troubleshooting =
    content.content.troubleshootingSteps.length > 0
      ? `\n\n**Troubleshooting Steps:**\n${content.content.troubleshootingSteps
          .map((step) => `${step.step}. ${step.title}`)
          .join("\n")}`
      : "";

  const codeExamples =
    content.content.codeExamples.length > 0
      ? `\n\n**Code Examples:** ${content.content.codeExamples.length} example(s) available`
      : "";

  return `# ${content.title}

**Service:** ${content.service.toUpperCase()}
**Provider:** ${content.provider.toUpperCase()}
**Category:** ${content.category}
**Guide Type:** ${content.guideType}
**URL:** ${content.url}

**Description:** ${content.description}

**Keywords:** ${content.keywords.join(", ")}${sections}${troubleshooting}${codeExamples}

**Last Updated:** ${content.lastUpdated}`;
}
