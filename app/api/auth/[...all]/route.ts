import { auth } from "@/lib/auth"; // path to your auth file
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handler = toNextJsHandler(auth);

// CORS headers helper
function getCorsHeaders(origin?: string | null, requestUrl?: string) {
  // When using credentials, we must return a specific origin, not "*"
  // Use the request origin if available, otherwise construct from request URL
  let allowedOrigin: string;
  
  if (origin) {
    allowedOrigin = origin;
  } else if (requestUrl) {
    const url = new URL(requestUrl);
    allowedOrigin = `${url.protocol}//${url.host}`;
  } else {
    // Fallback to environment variable or localhost
    allowedOrigin = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 
                     process.env.BETTER_AUTH_URL || 
                     "http://localhost:3000";
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = await handler.GET(request);
  
  // Add CORS headers to response
  const corsHeaders = getCorsHeaders(origin, request.url);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = await handler.POST(request);
  
  // Add CORS headers to response
  const corsHeaders = getCorsHeaders(origin, request.url);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin, request.url);
  
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}