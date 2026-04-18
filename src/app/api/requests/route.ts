import { NextResponse } from "next/server";
import { requestDraftSchema } from "@/lib/procurement-schemas";
import { createRequest, listRequests } from "@/lib/server/request-repository";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    requests: await listRequests(),
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = requestDraftSchema.parse(payload);
    const created = await createRequest(parsed);

    return NextResponse.json(
      {
        request: created,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create request.",
      },
      { status: 400 },
    );
  }
}
