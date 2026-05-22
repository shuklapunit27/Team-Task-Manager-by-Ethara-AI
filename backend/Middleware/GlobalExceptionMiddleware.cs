using System.Net;
using System.Text.Json;
using TeamTaskManager.Api.DTOs;

namespace TeamTaskManager.Api.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async System.Threading.Tasks.Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception has occurred: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static System.Threading.Tasks.Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        
        var statusCode = (int)HttpStatusCode.InternalServerError;
        var message = "An internal server error occurred.";
        var errors = new List<string> { exception.Message };

        switch (exception)
        {
            case UnauthorizedAccessException:
                statusCode = (int)HttpStatusCode.Unauthorized;
                message = "Unauthorized access.";
                break;

            case KeyNotFoundException:
                statusCode = (int)HttpStatusCode.NotFound;
                message = "The requested resource was not found.";
                break;

            case ArgumentException or InvalidOperationException:
                statusCode = (int)HttpStatusCode.BadRequest;
                message = exception.Message;
                break;
        }

        context.Response.StatusCode = statusCode;

        var response = ApiResponse<object>.FailureResponse(message, errors);
        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var jsonString = JsonSerializer.Serialize(response, jsonOptions);

        return context.Response.WriteAsync(jsonString);
    }
}
