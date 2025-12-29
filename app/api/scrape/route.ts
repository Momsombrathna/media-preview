import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const runtime = "nodejs";

function isValidUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: await chromium.executablePath(),
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const data = await page.evaluate(() => {
      const ogTitle =
        document
          .querySelector('meta[property="og:title"]')
          ?.getAttribute("content") || "";
      const ogDesc =
        document
          .querySelector('meta[property="og:description"]')
          ?.getAttribute("content") || "";
      const ogImage =
        document
          .querySelector('meta[property="og:image"]')
          ?.getAttribute("content") || "";
      const ogUrl =
        document
          .querySelector('meta[property="og:url"]')
          ?.getAttribute("content") || window.location.href;

      // Parse followers, following, posts from description
      let followers = "";
      let following = "";
      let postsCount = "";
      if (ogDesc) {
        const followersMatch = ogDesc.match(
          /(\d+(?:\.\d+)?[KkMm]?)\s+Followers/
        );
        if (followersMatch) followers = followersMatch[1];
        const followingMatch = ogDesc.match(
          /(\d+(?:\.\d+)?[KkMm]?)\s+Following/
        );
        if (followingMatch) following = followingMatch[1];
        const postsMatch = ogDesc.match(/(\d+(?:\.\d+)?[KkMm]?)\s+Posts/);
        if (postsMatch) postsCount = postsMatch[1];
      }

      return {
        title: ogTitle || "No title",
        description: ogDesc || "",
        image: ogImage || "",
        url: ogUrl,
        blocked: !ogTitle && !ogImage,
        followers,
        following,
        postsCount,
      };
    });

    // Scroll to load more content
    await page.evaluate(() => window.scrollTo(0, 2000));
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Get post images from the page
    const postImages = await page.evaluate(() => {
      const imgs = Array.from(
        document.querySelectorAll("img") as NodeListOf<HTMLImageElement>
      )
        .filter((img) => {
          const src = img.src || img.getAttribute("data-src") || "";
          return src.includes("cdninstagram.com") && !src.includes("profile");
        })
        .slice(0, 10)
        .map((img) => ({
          image: img.src || img.getAttribute("data-src") || "",
          type: "post" as const,
          title: "",
          description: "",
          url: "",
          blocked: false,
        }));
      return imgs;
    });

    await browser.close();
    return NextResponse.json({ items: [data, ...postImages] });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("SCRAPE ERROR:", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch preview" },
      { status: 500 }
    );
  } finally {
    // Ensure browser is closed even if an error occurs
  }
}
