import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { registerRecipeTools } from '../utils/mcp/recipes'
import { registerTagTools } from '../utils/mcp/tags'

export default defineEventHandler(async (event) => {
  // The middleware already resolved the principal from the Bearer token
  // (ai-chat sends the user's access token) or the session cookie (browser).
  // Require a real authenticated user — never trust a caller-asserted identity.
  requireAuthUser(event)

  const db = getPrisma()
  const server = new McpServer({ name: 'recipes-book', version: '1.0.0' })

  registerRecipeTools(server, db)
  registerTagTools(server, db)

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)

  const body = event.node.req.method === 'POST' ? await readBody(event) : undefined
  await transport.handleRequest(event.node.req, event.node.res, body)
})
