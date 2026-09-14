import { NextResponse } from "next/server";

import { getConfiguredFeaturedPortfolioProjects, getPortfolioProjectById } from "@/lib/portfolioShowcase";

function parseLimit(value: string | null): number {
  if (!value) return 10;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 10;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  if (projectId) {
    const project = await getPortfolioProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Installation project not found." },
        { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    return NextResponse.json(
      { project },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const onlyFeatured = url.searchParams.get("featured") !== "false";
  const projects = onlyFeatured ? await getConfiguredFeaturedPortfolioProjects(parseLimit(url.searchParams.get("limit"))) : [];

  return NextResponse.json(
    { projects },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
