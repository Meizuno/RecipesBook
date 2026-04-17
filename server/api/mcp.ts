import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { getHeader } from 'h3'
import { registerRecipeTools } from '../utils/mcp/recipes'
import { registerTagTools } from '../utils/mcp/tags'

export default defineEventHandler(async (event) => {
  // Auth: user session or MCP key
  const config = useRuntimeConfig()
  const header = getHeader(event, 'authorization') ?? ''
  const isMcpKey = config.mcpKey && header === `Bearer ${config.mcpKey}`

  if (!isMcpKey) {
    await requireAuthUser(event)
  }

  const db = getPrisma()
  const server = new McpServer({ name: 'recipes-book', version: '1.0.0' })

  registerRecipeTools(server, db)
  registerTagTools(server, db)

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)

  const body = event.node.req.method === 'POST' ? await readBody(event) : undefined
  await transport.handleRequest(event.node.req, event.node.res, body)
})
