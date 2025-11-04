import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
const server = new Server({
    name: "keyword-search-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
const searchKeywordTool = {
    name: "search_keyword",
    description: "Searches for a specified keyword within a file",
    inputSchema: {
        type: "object",
        properties: {
            file_path: {
                type: "string",
                description: "Path to the file to search in",
            },
            keyword: {
                type: "string",
                description: "Keyword to search for",
            },
            case_sensitive: {
                type: "boolean",
                description: "Whether the search should be case-sensitive",
                default: false,
            },
        },
        required: ["file_path", "keyword"],
    },
};
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [searchKeywordTool],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === "search_keyword") {
        const filePath = args?.file_path;
        const keyword = args?.keyword;
        const caseSensitive = args?.case_sensitive || false;
        if (!filePath || !keyword) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: "file_path and keyword are required",
                        }),
                    },
                ],
            };
        }
        try {
            const fullPath = path.resolve(filePath);
            if (!fs.existsSync(fullPath)) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: `File not found: ${fullPath}`,
                            }),
                        },
                    ],
                };
            }
            const stats = fs.statSync(fullPath);
            if (!stats.isFile()) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: `Path is not a file: ${fullPath}`,
                            }),
                        },
                    ],
                };
            }
            const fileContent = fs.readFileSync(fullPath, "utf-8");
            const searchPattern = caseSensitive
                ? keyword
                : keyword.toLowerCase();
            const content = caseSensitive
                ? fileContent
                : fileContent.toLowerCase();
            const lines = fileContent.split("\n");
            const matches = [];
            lines.forEach((line, index) => {
                const searchLine = caseSensitive ? line : line.toLowerCase();
                if (searchLine.includes(searchPattern)) {
                    matches.push({
                        line_number: index + 1,
                        line_content: line.trim(),
                    });
                }
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            file_path: fullPath,
                            keyword: keyword,
                            case_sensitive: caseSensitive,
                            total_matches: matches.length,
                            matches: matches,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: error instanceof Error ? error.message : String(error),
                        }),
                    },
                ],
            };
        }
    }
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    error: `Unknown tool: ${name}`,
                }),
            },
        ],
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Keyword Search MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map