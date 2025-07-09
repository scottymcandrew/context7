# Cloud Provider Documentation Integration Guide

## Overview

This guide documents the addition of cloud provider documentation integration to the Context7 MCP server. The new functionality enables AI tools to search and retrieve up-to-date troubleshooting documentation from cloud providers (currently AWS) to help diagnose and resolve SaaS connector issues.

## 🎯 Purpose

Enhance internal AI troubleshooting capabilities by providing access to:
- Current AWS IAM permission documentation
- S3 bucket policy troubleshooting guides
- Lambda execution role configuration help
- API Gateway authentication guidance
- Real-time cloud service error resolution

## 🏗️ Architecture Changes

### New Files Added
- No new files - all functionality integrated into existing structure

### Modified Files

#### 1. `src/lib/types.ts`
**Added cloud provider type definitions:**
```typescript
// Core content structure
interface CloudProviderContent {
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

// Search interfaces
interface CloudProviderSearchRequest {
  query: string;
  provider: CloudProvider;
  service?: string;
  category?: TroubleshootingCategory;
  guideType?: GuideType;
  maxResults?: number;
}

// Enums for better type safety
enum CloudProvider { AWS = "aws", AZURE = "azure", GCP = "gcp" }
enum TroubleshootingCategory { 
  ACCESS_DENIED = "access-denied",
  CONFIGURATION = "configuration", 
  PERMISSIONS = "permissions",
  AUTHENTICATION = "authentication",
  API_ERRORS = "api-errors",
  NETWORK = "network",
  PERFORMANCE = "performance",
  GENERAL = "general"
}
```

#### 2. `src/lib/api.ts`
**Added AWS documentation scraping functionality:**
```typescript
// AWS documentation constants
const AWS_DOCS_BASE_URL = "https://docs.aws.amazon.com";
const AWS_SERVICE_PATTERNS = {
  iam: "/IAM/latest/UserGuide/",
  s3: "/AmazonS3/latest/userguide/",
  lambda: "/lambda/latest/dg/",
  apigateway: "/apigateway/latest/developerguide/",
  cloudwatch: "/AmazonCloudWatch/latest/",
  ec2: "/AWSEC2/latest/UserGuide/",
  rds: "/AmazonRDS/latest/UserGuide/",
  dynamodb: "/amazondynamodb/latest/developerguide/"
};

// Main search function
export async function searchCloudProviderDocs(
  searchRequest: CloudProviderSearchRequest
): Promise<CloudProviderSearchResponse>

// AWS-specific search implementation
async function searchAwsDocs(...)
async function fetchAwsDocContent(...)
function parseAwsDocumentationHtml(...)
```

**Key Features:**
- Content caching (12-hour TTL)
- HTML parsing with metadata extraction
- Service-specific URL pattern matching
- Error handling for 404s and rate limits

#### 3. `src/lib/utils.ts`
**Added content processing utilities:**
```typescript
// HTML content processing
export function extractTroubleshootingSteps(html: string): TroubleshootingStep[]
export function extractCodeExamples(html: string): CodeExample[]
export function extractErrorsFromText(text: string): string[]
export function cleanHtmlContent(html: string): string

// Content formatting
export function formatCloudProviderContent(content: CloudProviderContent): string
```

**Features:**
- Intelligent troubleshooting step extraction from ordered lists
- Code example detection with language identification
- Error message pattern recognition
- HTML cleaning and text formatting

#### 4. `src/index.ts`
**Added new MCP tool registration:**
```typescript
server.tool(
  "get-cloud-provider-docs",
  `Searches and retrieves cloud provider documentation for troubleshooting connector issues.`,
  {
    query: z.string().describe("Search query describing the issue"),
    provider: z.nativeEnum(CloudProvider).describe("Cloud provider (aws, azure, gcp)"),
    service: z.string().optional().describe("Specific service (iam, s3, lambda, etc.)"),
    category: z.nativeEnum(TroubleshootingCategory).optional(),
    maxResults: z.number().optional().default(5)
  },
  async ({ query, provider, service, category, maxResults }) => {
    // Implementation handles search and formatting
  }
);
```

## 🔧 Implementation Details

### AWS Documentation Strategy

Since AWS deprecated their GitHub documentation repositories, the implementation uses direct web scraping of `docs.aws.amazon.com`:

1. **URL Pattern Matching**: Predefined patterns for major AWS services
2. **Troubleshooting Page Discovery**: Common troubleshooting URL patterns
3. **Content Parsing**: Extract titles, descriptions, sections, and code examples
4. **Intelligent Categorization**: Classify content by troubleshooting type

### Content Processing Pipeline

1. **Fetch**: HTTP request to AWS documentation URL
2. **Parse**: Extract metadata and structured content from HTML
3. **Process**: Clean HTML, extract troubleshooting steps and code examples
4. **Cache**: Store processed content with 12-hour TTL
5. **Format**: Return structured response for AI consumption

### Error Handling

- **404 Errors**: Gracefully handle non-existent documentation pages
- **Rate Limiting**: Respect AWS documentation site limits
- **Network Issues**: Timeout and retry logic
- **Invalid Content**: Validate and sanitize parsed content

## 🧪 Testing Guide

### Prerequisites
```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### 1. Test Tool Registration
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js
```

**Expected Output**: Should list three tools including `get-cloud-provider-docs`

### 2. Test AWS IAM Troubleshooting
```bash
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "get-cloud-provider-docs", "arguments": {"query": "troubleshoot", "provider": "aws", "service": "iam", "maxResults": 1}}}' | node dist/index.js
```

**Expected Output**: 
- Successfully finds IAM troubleshooting documentation
- Returns structured content with title, URL, description, keywords
- Includes key sections and usage tips

### 3. Test Service-Specific Search
```bash
echo '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get-cloud-provider-docs", "arguments": {"query": "access denied", "provider": "aws", "service": "s3", "category": "access-denied", "maxResults": 2}}}' | node dist/index.js
```

### 4. Test Error Handling
```bash
# Test unsupported provider
echo '{"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "get-cloud-provider-docs", "arguments": {"query": "test", "provider": "azure"}}}' | node dist/index.js
```

**Expected Output**: Clear error message about unsupported provider

### 5. Test MCP Inspector Integration
```bash
npx -y @modelcontextprotocol/inspector npx @upstash/context7-mcp
```

## 🚀 Deployment & Usage

### 1. MCP Client Integration

Add to your MCP client configuration (e.g., Cursor, Claude Desktop):

```json
{
  "mcpServers": {
    "context7-cloud": {
      "command": "node",
      "args": ["/path/to/your/forked/context7/dist/index.js"]
    }
  }
}
```

### 2. AI Tool Usage Examples

**Diagnose S3 Access Issues:**
```json
{
  "tool": "get-cloud-provider-docs",
  "arguments": {
    "query": "S3 bucket policy access denied error",
    "provider": "aws",
    "service": "s3", 
    "category": "access-denied"
  }
}
```

**IAM Role Troubleshooting:**
```json
{
  "tool": "get-cloud-provider-docs",
  "arguments": {
    "query": "assume role permissions",
    "provider": "aws",
    "service": "iam",
    "category": "permissions"
  }
}
```

**Lambda Execution Issues:**
```json
{
  "tool": "get-cloud-provider-docs", 
  "arguments": {
    "query": "lambda execution role",
    "provider": "aws",
    "service": "lambda",
    "category": "configuration"
  }
}
```

### 3. Integration with SaaS Troubleshooting

Your AI troubleshooting tool can now:

1. **Detect Cloud Connectivity Issues**: Use existing error detection
2. **Query Relevant Documentation**: Call `get-cloud-provider-docs` with specific parameters
3. **Parse Structured Guidance**: Extract troubleshooting steps and code examples
4. **Provide Current Solutions**: Always get up-to-date AWS documentation

## 📋 Supported AWS Services

Currently configured for:
- **IAM**: Identity and Access Management
- **S3**: Simple Storage Service  
- **Lambda**: Serverless Functions
- **API Gateway**: API Management
- **CloudWatch**: Monitoring and Logging
- **EC2**: Virtual Servers
- **RDS**: Relational Database Service
- **DynamoDB**: NoSQL Database

## 🔮 Future Enhancements

### Phase 2: Azure Support
- Implement Azure documentation scraping
- Add Azure-specific service patterns
- Extend troubleshooting categories

### Phase 3: GCP Support  
- Google Cloud Platform documentation integration
- GCP service mapping
- Multi-cloud troubleshooting scenarios

### Phase 4: Enhanced Features
- Semantic search using embeddings
- Automated error code recognition
- Integration with cloud provider APIs
- Real-time documentation updates

## 🛠️ Development Notes

### Adding New AWS Services
1. Add service pattern to `AWS_SERVICE_PATTERNS` in `api.ts`
2. Update service mapping in `parseAwsDocumentationHtml()`
3. Test with service-specific troubleshooting pages

### Extending to Other Providers
1. Add provider enum to `types.ts`
2. Implement provider-specific search function in `api.ts`
3. Add provider case to `searchCloudProviderDocs()`
4. Update tool documentation in `index.ts`

### Performance Optimization
- Adjust `CACHE_TTL` based on documentation update frequency
- Implement incremental cache updates
- Add content compression for large documentation pages

## 🔒 Security Considerations

- **Rate Limiting**: Respect cloud provider documentation site limits
- **Content Validation**: Sanitize all parsed HTML content
- **Error Handling**: Don't expose internal implementation details
- **Caching**: Ensure cached content doesn't contain sensitive information

## 📊 Monitoring & Metrics

Consider tracking:
- Documentation fetch success/failure rates
- Cache hit ratios
- Search query patterns
- Response times by cloud provider and service

## 🤝 Contributing

When extending this functionality:
1. Follow existing code patterns and TypeScript interfaces
2. Add comprehensive error handling
3. Include unit tests for new functionality
4. Update this documentation with changes
5. Test against real cloud provider documentation

---

**Last Updated**: 2025-01-09  
**Version**: 1.0.0  
**Compatible with**: Context7 MCP Server v1.0.13+