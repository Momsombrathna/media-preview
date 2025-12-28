import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

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
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
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

      return {
        title: ogTitle || "No title",
        description: ogDesc || "",
        image: ogImage || "",
        url: ogUrl,
        blocked: !ogTitle && !ogImage,
      };
    });

    await browser.close();
    return NextResponse.json(data);
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
