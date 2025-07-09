# Fork and Deploy Guide: Context7 with Cloud Provider Integration

## 🎯 Overview

This guide walks you through forking the Context7 MCP server repository with your new cloud provider documentation integration and deploying it for your SaaS troubleshooting needs.

## 📋 Pre-Fork Checklist

### ✅ Changes Made
- [x] Added cloud provider types and interfaces (`types.ts`)
- [x] Implemented AWS documentation scraping (`api.ts`)
- [x] Created `get-cloud-provider-docs` MCP tool (`index.ts`)
- [x] Added content processing utilities (`utils.ts`)
- [x] Tested basic functionality
- [x] Created comprehensive documentation

### ✅ Files Modified
```
src/lib/types.ts      - Cloud provider type definitions
src/lib/api.ts        - AWS documentation integration
src/lib/utils.ts      - Content processing utilities  
src/index.ts          - New MCP tool registration
```

### ✅ New Files Added
```
CLOUD_PROVIDER_INTEGRATION_GUIDE.md - Technical documentation
FORK_AND_DEPLOY_GUIDE.md            - This guide
```

## 🍴 Forking Strategy

### Option 1: Fork Original Repository (Recommended)

1. **Fork the Original Repository**
   ```bash
   # Navigate to https://github.com/upstash/context7
   # Click "Fork" button
   # Choose your GitHub account/organization
   ```

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/context7.git
   cd context7
   ```

3. **Add Your Changes**
   ```bash
   # Copy the modified files from your current workspace
   cp /Users/scottmcandrew/workspace/github.com/context7/src/lib/types.ts src/lib/
   cp /Users/scottmcandrew/workspace/github.com/context7/src/lib/api.ts src/lib/
   cp /Users/scottmcandrew/workspace/github.com/context7/src/lib/utils.ts src/lib/
   cp /Users/scottmcandrew/workspace/github.com/context7/src/index.ts src/
   cp /Users/scottmcandrew/workspace/github.com/context7/CLOUD_PROVIDER_INTEGRATION_GUIDE.md .
   cp /Users/scottmcandrew/workspace/github.com/context7/FORK_AND_DEPLOY_GUIDE.md .
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add cloud provider documentation integration

   - Add AWS documentation scraping capabilities
   - Implement get-cloud-provider-docs MCP tool
   - Support for troubleshooting IAM, S3, Lambda, API Gateway
   - Add comprehensive content processing utilities
   - Include documentation and deployment guides"
   
   git push origin main
   ```

### Option 2: Create New Repository

1. **Create New Repository**
   ```bash
   # On GitHub, create new repository: context7-enhanced
   git clone https://github.com/YOUR_USERNAME/context7-enhanced.git
   cd context7-enhanced
   ```

2. **Copy Original Content + Your Changes**
   ```bash
   # Copy entire current workspace
   cp -r /Users/scottmcandrew/workspace/github.com/context7/* .
   
   # Initialize and commit
   git add .
   git commit -m "initial: Context7 MCP with cloud provider integration"
   git push origin main
   ```

## 🏷️ Version and Branding

### Update Package Information

Edit `package.json`:
```json
{
  "name": "@YOUR_ORG/context7-cloud-mcp",
  "version": "1.1.0",
  "description": "Context7 MCP server with cloud provider documentation integration",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YOUR_USERNAME/context7.git"
  },
  "keywords": [
    "modelcontextprotocol",
    "mcp",
    "context7",
    "aws",
    "cloud-provider",
    "troubleshooting",
    "documentation"
  ],
  "author": "YOUR_NAME",
  "contributors": [
    "abdush (original Context7)",
    "YOUR_NAME (cloud provider integration)"
  ]
}
```

### Update README.md

Add section about cloud provider integration:

```markdown
## 🔧 New: Cloud Provider Integration

This enhanced version includes cloud provider documentation integration for SaaS troubleshooting:

### Additional Tool: `get-cloud-provider-docs`

Search and retrieve cloud provider documentation for troubleshooting connector issues.

**Example Usage:**
```bash
# Troubleshoot S3 access issues
get-cloud-provider-docs query="S3 access denied" provider="aws" service="s3" category="access-denied"

# IAM permission problems  
get-cloud-provider-docs query="assume role" provider="aws" service="iam" category="permissions"
```

**Supported Providers:**
- ✅ AWS (IAM, S3, Lambda, API Gateway, CloudWatch, EC2, RDS, DynamoDB)
- 🔄 Azure (coming soon)
- 🔄 GCP (coming soon)

For detailed documentation, see [CLOUD_PROVIDER_INTEGRATION_GUIDE.md](./CLOUD_PROVIDER_INTEGRATION_GUIDE.md).
```

## 🚀 Deployment Options

### Option 1: NPM Package (Recommended for Internal Use)

1. **Publish to Private NPM Registry**
   ```bash
   # Configure for your private registry
   npm config set registry https://your-private-npm-registry.com
   
   # Or use GitHub Packages
   npm config set '@YOUR_ORG:registry' https://npm.pkg.github.com
   
   # Build and publish
   npm run build
   npm publish
   ```

2. **Install in Your Environment**
   ```bash
   npm install @YOUR_ORG/context7-cloud-mcp
   ```

### Option 2: Direct Git Installation

```json
{
  "mcpServers": {
    "context7-cloud": {
      "command": "npx",
      "args": ["-y", "github:YOUR_USERNAME/context7"]
    }
  }
}
```

### Option 3: Local Development/Testing

```json
{
  "mcpServers": {
    "context7-cloud": {
      "command": "node",
      "args": ["/path/to/your/context7/dist/index.js"]
    }
  }
}
```

### Option 4: Docker Deployment

1. **Update Dockerfile** (if using containerized deployment):
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   # Copy your enhanced version
   COPY package*.json ./
   RUN npm install
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   CMD ["node", "dist/index.js", "--transport", "http", "--port", "3000"]
   ```

2. **Build and Deploy**
   ```bash
   docker build -t context7-cloud .
   docker run -p 3000:3000 context7-cloud
   ```

## 🔧 MCP Client Configuration

### Cursor IDE
```json
{
  "mcpServers": {
    "context7-cloud": {
      "command": "npx",
      "args": ["-y", "@YOUR_ORG/context7-cloud-mcp"]
    }
  }
}
```

### Claude Desktop
```json
{
  "mcpServers": {
    "Context7-Cloud": {
      "command": "npx", 
      "args": ["-y", "@YOUR_ORG/context7-cloud-mcp"]
    }
  }
}
```

### VS Code
```json
{
  "mcp": {
    "servers": {
      "context7-cloud": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@YOUR_ORG/context7-cloud-mcp"]
      }
    }
  }
}
```

## 🧪 Validation Testing

### 1. Pre-Deployment Testing
```bash
# Install dependencies and build
npm install
npm run build

# Test tool listing
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js

# Test AWS functionality
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "get-cloud-provider-docs", "arguments": {"query": "troubleshoot", "provider": "aws", "service": "iam"}}}' | node dist/index.js
```

### 2. MCP Inspector Testing
```bash
npx -y @modelcontextprotocol/inspector npx @YOUR_ORG/context7-cloud-mcp
```

### 3. Integration Testing
Test with your actual SaaS troubleshooting scenarios:
- S3 bucket access denied errors
- IAM role assumption failures  
- Lambda execution permission issues
- API Gateway authentication problems

## 📊 Monitoring Your Deployment

### Basic Health Checks
```bash
# Test server responsiveness
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

### Performance Monitoring
Consider tracking:
- Response times for cloud provider queries
- Cache hit rates for AWS documentation
- Error rates by service type
- Most common troubleshooting queries

### Logging
The enhanced server logs:
- Cloud provider API calls
- Cache hits/misses
- Parse errors
- Rate limiting events

## 🔄 Maintenance and Updates

### Keeping Up with Context7 Updates

1. **Add Original as Upstream**
   ```bash
   git remote add upstream https://github.com/upstash/context7.git
   ```

2. **Regular Sync Process**
   ```bash
   # Fetch upstream changes
   git fetch upstream
   
   # Create branch for updates
   git checkout -b sync-upstream
   git merge upstream/main
   
   # Resolve conflicts, test, and merge
   git checkout main
   git merge sync-upstream
   ```

### Updating AWS Service Support

1. **Add New Service Pattern** (`api.ts`):
   ```typescript
   const AWS_SERVICE_PATTERNS = {
     // existing services...
     newservice: "/NewService/latest/UserGuide/"
   };
   ```

2. **Test New Service**:
   ```bash
   echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get-cloud-provider-docs", "arguments": {"query": "test", "provider": "aws", "service": "newservice"}}}' | node dist/index.js
   ```

## 🔐 Security Considerations

### Environment Variables
```bash
# Optional: Add rate limiting configuration
export AWS_DOCS_RATE_LIMIT=10  # requests per minute
export CACHE_TTL_HOURS=12      # cache duration
```

### Network Security
- Ensure your deployment can access `docs.aws.amazon.com`
- Consider firewall rules for HTTP transport mode
- Monitor for unusual traffic patterns

## 📈 Usage Analytics

Track these metrics to optimize your troubleshooting workflows:
- Most queried AWS services
- Common error patterns
- Resolution success rates
- Response time by query complexity

## 🤝 Contributing Back

Consider contributing improvements back to the original Context7 project:
1. Create feature branch with generic cloud provider support
2. Remove organization-specific customizations  
3. Submit PR to upstash/context7
4. Benefits the entire community

## 📞 Support and Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clean and rebuild
   rm -rf node_modules dist
   npm install
   npm run build
   ```

2. **AWS Documentation Not Found**
   - Check service name spelling
   - Verify AWS hasn't changed URL patterns
   - Check network connectivity to docs.aws.amazon.com

3. **Cache Issues**
   - Restart server to clear cache
   - Adjust CACHE_TTL if documentation updates frequently

### Getting Help
- Check [CLOUD_PROVIDER_INTEGRATION_GUIDE.md](./CLOUD_PROVIDER_INTEGRATION_GUIDE.md) for technical details
- Review original Context7 documentation
- Test with MCP Inspector for debugging

---

**Next Steps:**
1. ✅ Choose your forking strategy
2. ✅ Update package.json and README
3. ✅ Deploy to your preferred environment  
4. ✅ Configure your MCP clients
5. ✅ Test with real troubleshooting scenarios
6. ✅ Monitor and optimize performance