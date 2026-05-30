import { getDevosInstallScript } from "../../lib/install-script";

export function GET(): Response {
	return new Response(getDevosInstallScript(), {
		headers: {
			"cache-control": "public, max-age=300",
			"content-type": "text/plain; charset=utf-8",
		},
	});
}
