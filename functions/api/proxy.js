
/****************************************************
 * HSE PERFORMANCE DASHBOARD
 * CLOUDFLARE PAGES API PROXY
 * Version: 1.0.0
 *
 * Route:
 * POST /api/proxy
 *
 * Environment variable:
 * APPS_SCRIPT_URL
 *
 * Responsibilities:
 * - Accept JSON POST requests
 * - Validate request body
 * - Enforce size limit
 * - Forward request to Google Apps Script
 * - Return upstream JSON response
 * - Avoid exposing Apps Script endpoint to frontend
 ****************************************************/

const MAX_REQUEST_BYTES = 2 * 1024 * 1024;

export async function onRequest(context) {
  const request = context.request;
  const env = context.env;

  // Only POST is allowed.
  if (request.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        error: "METHOD_NOT_ALLOWED"
      },
      405
    );
  }

  // Require JSON.
  const contentType =
    request.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse(
      {
        ok: false,
        error: "CONTENT_TYPE_REQUIRED"
      },
      415
    );
  }

  // Check declared request size.
  const declaredLength = Number(
    request.headers.get("content-length") || 0
  );

  if (
    declaredLength &&
    declaredLength > MAX_REQUEST_BYTES
  ) {
    return jsonResponse(
      {
        ok: false,
        error: "REQUEST_TOO_LARGE"
      },
      413
    );
  }

  // Check Apps Script configuration.
  const upstreamUrl = env.APPS_SCRIPT_URL;

  if (
    !upstreamUrl ||
    typeof upstreamUrl !== "string"
  ) {
    return jsonResponse(
      {
        ok: false,
        error: "API_CONFIGURATION_MISSING"
      },
      500
    );
  }

  let bodyBytes;

  try {
    bodyBytes = await request.arrayBuffer();
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: "REQUEST_BODY_READ_FAILED"
      },
      400
    );
  }

  // Actual body size check.
  if (bodyBytes.byteLength > MAX_REQUEST_BYTES) {
    return jsonResponse(
      {
        ok: false,
        error: "REQUEST_TOO_LARGE"
      },
      413
    );
  }

  if (bodyBytes.byteLength === 0) {
    return jsonResponse(
      {
        ok: false,
        error: "REQUEST_BODY_REQUIRED"
      },
      400
    );
  }

  // Validate JSON and action.
  let parsedRequest;

  try {
    parsedRequest = JSON.parse(
      new TextDecoder().decode(bodyBytes)
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: "INVALID_JSON"
      },
      400
    );
  }

  if (
    !parsedRequest ||
    typeof parsedRequest !== "object" ||
    Array.isArray(parsedRequest) ||
    typeof parsedRequest.action !== "string" ||
    !parsedRequest.action.trim()
  ) {
    return jsonResponse(
      {
        ok: false,
        error: "INVALID_REQUEST"
      },
      400
    );
  }

  // Forward request to Apps Script.
  try {
    const upstreamResponse = await fetch(
      upstreamUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: bodyBytes
      }
    );

    const responseBody =
      await upstreamResponse.text();

    return new Response(responseBody, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type":
          upstreamResponse.headers.get("content-type") ||
          "application/json; charset=utf-8",

        "Cache-Control": "no-store"
      }
    });

  } catch (error) {
    // Do not expose internal exception details.
    return jsonResponse(
      {
        ok: false,
        error: "UPSTREAM_CONNECTION_FAILED"
      },
      502
    );
  }
}


/****************************************************
 * JSON RESPONSE HELPER
 ****************************************************/

function jsonResponse(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
