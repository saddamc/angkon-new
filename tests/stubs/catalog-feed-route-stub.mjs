/** Controllable stand-in for the public catalog feed route. */

export const feedState = {
  lastUrl: null,
  body: '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>stub feed</title></channel></rss>',
  status: 200,
  calls: 0,
};

export function resetFeed() {
  feedState.lastUrl = null;
  feedState.status = 200;
  feedState.calls = 0;
}

export async function GET(request) {
  feedState.calls += 1;
  feedState.lastUrl = request.nextUrl;
  return new Response(feedState.body, {
    status: feedState.status,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Catalog-Total-Items": "16",
    },
  });
}
