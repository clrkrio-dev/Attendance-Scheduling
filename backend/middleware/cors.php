<?php

// ---------------------------------------------------------------------------
// Development CORS enabler.
// Same-origin requests (the normal setup) are unaffected; cross-origin clients
// that call the API from another port/domain are allowed by default.
// ---------------------------------------------------------------------------

// Sends the CORS headers for the current request.
function enableCors()
{
    $origin = array_key_exists("HTTP_ORIGIN", $_SERVER)
        ? $_SERVER["HTTP_ORIGIN"]
        : "";

    // Reflect only http(s) origins so responses stay cache-safe; same-origin
    // requests (the normal setup) do not need the header at all.
    if (is_string($origin) && preg_match("#^https?://#i", $origin)) {
        header("Access-Control-Allow-Origin: " . $origin);
        header("Vary: Origin");
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 86400");
}

// Responds early to browser preflight (OPTIONS) requests.
function handlePreflight()
{
    if (($_SERVER["REQUEST_METHOD"] ?? "") === "OPTIONS") {
        http_response_code(204);
        exit(0);
    }
}