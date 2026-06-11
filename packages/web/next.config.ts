import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const serverBaseUrl =
	process.env.DEVOS_SERVER_BASE_URL ?? "http://127.0.0.1:3001";
const workspaceRoot = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);

const nextConfig: NextConfig = {
	allowedDevOrigins: ["127.0.0.1"],
	reactStrictMode: true,
	turbopack: {
		root: workspaceRoot,
	},
	async rewrites() {
		return [
			{
				source: "/api-docs",
				destination: `${serverBaseUrl}/api-docs`,
			},
			{
				source: "/api-docs/:path*",
				destination: `${serverBaseUrl}/api-docs/:path*`,
			},
			{
				source: "/openapi",
				destination: `${serverBaseUrl}/openapi`,
			},
			{
				source: "/openapi/:path*",
				destination: `${serverBaseUrl}/openapi/:path*`,
			},
			{
				source: "/openapi.yaml",
				destination: `${serverBaseUrl}/openapi.yaml`,
			},
			{
				source: "/api/:path*",
				destination: `${serverBaseUrl}/api/:path*`,
			},
			{
				source: "/health",
				destination: `${serverBaseUrl}/health`,
			},
		];
	},
};

export default nextConfig;
