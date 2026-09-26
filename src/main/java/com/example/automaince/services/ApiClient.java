package com.example.automaince.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/** HTTP client for the same Node.js API used by the browser interface. */
public final class ApiClient {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
    private static final String BASE_URL = System.getProperty("automaince.api",
            System.getenv().getOrDefault("AUTOMAINCE_API", "http://localhost:3000"));

    private ApiClient() {}

    public static List<Map<String, Object>> list(String resource) throws Exception {
        var response = send("GET", "/api/" + resource, null);
        return JSON.readValue(response, new TypeReference<>() {});
    }

    public static Map<String, Object> object(String resource) throws Exception {
        return JSON.readValue(send("GET", "/api/" + resource, null), new TypeReference<>() {});
    }

    public static Map<String, Object> create(String resource, Map<String, Object> value) throws Exception {
        return JSON.readValue(send("POST", "/api/" + resource, value), new TypeReference<>() {});
    }

    public static Map<String, Object> patch(String path) throws Exception {
        return JSON.readValue(send("PATCH", "/api/" + path, Map.of()), new TypeReference<>() {});
    }

    private static String send(String method, String path, Object body) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create(BASE_URL + path)).timeout(Duration.ofSeconds(12));
        if (body == null) builder.GET();
        else builder.header("Content-Type", "application/json").method(method,
                HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body)));
        var response = HTTP.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            String message;
            try { message = String.valueOf(JSON.readValue(response.body(), Map.class).get("error")); }
            catch (Exception ignored) { message = response.body(); }
            throw new IllegalStateException(message);
        }
        return response.body();
    }
}
