import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { registerRecipeTools } from '../utils/mcp/recipes'
import { registerTagTools } from '../utils/mcp/tags'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const db = getPrisma()

  const server = new McpServer({ name: 'cook-book', version: '1.0.0' })

  registerRecipeTools(server, db, user.id)
  registerTagTools(server, db, user.id)

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)

  const body = event.node.req.method === 'POST' ? await readBody(event) : undefined
  await transport.handleRequest(event.node.req, event.node.res, body)
})
