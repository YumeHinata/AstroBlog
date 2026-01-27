import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ params }) => {
    const hash = params.hash;

    if (!hash) {
        return new Response("Not Found", { status: 404 });
    }

    const posts = await getCollection("posts");

    // 大小写敏感匹配 legacyHash
    const target = posts.find(p => p.data.legacyHash === hash);

    if (!target) {
        return new Response("Not Found", { status: 404 });
    }

    return new Response(null, {
        status: 301, // SEO 友好永久重定向
        headers: {
            Location: `/posts/${target.slug}/`
        }
    });
};
