export interface SearchResult {
  id: string;
  title: string;
  description: string;
  branch: string;
  lastUpdateDate: string;
  state: DocumentState;
  totalTokens: number;
  totalSnippets: number;
  totalPages: number;
  stars?: number;
  trustScore?: number;
  versions?: string[];
}

export interface SearchResponse {
  error?: string;
  results: SearchResult[];
}

// Version state is still needed for validating search results
export type DocumentState = "initial" | "finalized" | "error" | "delete";

// Cloud Provider Documentation Types
export interface CloudProviderContent {
  title: string;
  service: string;
  provider: CloudProvider;
  guideType: GuideType;
  url: string;
  description: string;
  keywords: string[];
  content: {
    sections: ContentSection[];
    troubleshootingSteps: TroubleshootingStep[];
    codeExamples: CodeExample[];
  };
  breadcrumbs: BreadcrumbItem[];
  relatedLinks: string[];
  lastUpdated: string;
  category: TroubleshootingCategory;
}

export interface ContentSection {
  id: string;
  heading: string;
  content: string;
  level: number; // heading level (h1, h2, etc.)
}

export interface TroubleshootingStep {
  step: number;
  title: string;
  description: string;
  codeExample?: string;
  relatedErrors?: string[];
}

export interface CodeExample {
  language: string;
  code: string;
  description: string;
  filename?: string;
}

export interface BreadcrumbItem {
  title: string;
  url: string;
}

export interface CloudProviderSearchRequest {
  query: string;
  provider: CloudProvider;
  service?: string;
  category?: TroubleshootingCategory;
  guideType?: GuideType;
  maxResults?: number;
}

export interface CloudProviderSearchResponse {
  results: CloudProviderContent[];
  totalResults: number;
  searchTime: number;
  error?: string;
}

export enum CloudProvider {
  AWS = "aws",
  AZURE = "azure",
  GCP = "gcp",
}

export enum GuideType {
  USER_GUIDE = "UserGuide",
  API_REFERENCE = "APIReference",
  DEVELOPER_GUIDE = "DeveloperGuide",
  GENERAL_REFERENCE = "GeneralReference",
  TROUBLESHOOTING = "Troubleshooting",
}

export enum TroubleshootingCategory {
  ACCESS_DENIED = "access-denied",
  CONFIGURATION = "configuration",
  PERMISSIONS = "permissions",
  AUTHENTICATION = "authentication",
  API_ERRORS = "api-errors",
  NETWORK = "network",
  PERFORMANCE = "performance",
  GENERAL = "general",
}
