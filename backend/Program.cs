using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TeamTaskManager.Api.Data;
using TeamTaskManager.Api.Interfaces;
using TeamTaskManager.Api.Middleware;
using TeamTaskManager.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Configuration
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL");
if (string.IsNullOrEmpty(connectionString))
{
    connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
        ?? "Server=(localdb)\\mssqllocaldb;Database=TeamTaskManagerDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

// 2. Dependency Injection Services
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();

// 3. Authentication & JWT Pipeline
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SUPER_SECRET_KEY_FOR_TEAM_TASK_MANAGER_1234567890!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "TeamTaskManagerAdmin";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "TeamTaskManagerUsers";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero
    };
});

// 4. CORS Policy Setup
// 4. CORS Policy Setup
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:4200",
                "https://team-task-manager-by-ethara-ai-production-588a.up.railway.app"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
// 5. Controller Configuration (Prevent Circular JSON and Standardize Validation Response)
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();

            var response = TeamTaskManager.Api.DTOs.ApiResponse<object>.FailureResponse("Validation failed.", errors);
            return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(response);
        };
    });

// 6. Swagger Config with JWT Support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "Team Task Manager API", 
        Version = "v1",
        Description = "Production-ready Web API backend driving the Team Task Manager Application."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme.\n\nEnter 'Bearer' [space] and then your token in the text input below.\n\nExample: \"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\""
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(int.Parse(port));
});

var app = builder.Build();

// 7. Global Exceptions and CORS Mount
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Team Task Manager API v1");
    });
}

app.UseHttpsRedirection();

app.UseCors("AllowAngularFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// 8. Verify Database Connectivity on Startup
// 8. Verify Database Connectivity on Startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var context = services.GetRequiredService<ApplicationDbContext>();

    try 
    {
        var connection = context.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
        {
            connection.Open();
        }

        // Check if our critical Users table exists. If not, generate all tables manually.
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "SELECT OBJECT_ID('dbo.Users', 'U');";
            var result = command.ExecuteScalar();
            
            if (result == DBNull.Value || result == null)
            {
                logger.LogWarning("Tables missing! Generating raw relational schemas natively...");
                
                // This extracts the raw SQL script generated by your migrations assembly and executes it directly
                var databaseScript = context.Database.GenerateCreateScript();
                using (var scriptCommand = connection.CreateCommand())
                {
                    scriptCommand.CommandText = databaseScript;
                    scriptCommand.ExecuteNonQuery();
                }
                logger.LogInformation("Database structural schemas successfully generated inside the cloud database server.");
            }
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during raw schema validation or generation.");
    }

    var connString = context.Database.GetDbConnection()?.ConnectionString ?? "";
    var isLocalDb = connString.Contains("localdb", StringComparison.OrdinalIgnoreCase);
    if (!VerifyDatabase(context, logger))
    {
        if (!app.Environment.IsDevelopment() || isLocalDb)
        {
            logger.LogInformation("Production mode active or localdb missing: Bypassing strict schema connection blocks for cloud compatibility.");
        }
        else
        {
            logger.LogCritical("==================================================================================");
            logger.LogCritical("DATABASE RUNTIME ERROR: Database not found or schema is incomplete.");
            logger.LogCritical("Database not found. Run infra/run-db.ps1");
            logger.LogCritical("==================================================================================");
            
            // Exit gracefully as requested by requirements
            Environment.Exit(1);
        }
    }
    else
    {
        logger.LogInformation("Database connection and schema verified successfully.");
    }
}

app.Run();

// Helper method to verify connection and schema completeness
bool VerifyDatabase(ApplicationDbContext context, ILogger logger)
{
    try
    {
        logger.LogInformation("Checking database connection...");
        if (!context.Database.CanConnect())
        {
            logger.LogWarning("Database connection test: CanConnect() returned false.");
            return false;
        }

        var connection = context.Database.GetDbConnection();
        if (connection == null)
        {
            logger.LogWarning("Database connection object is null.");
            return false;
        }

        logger.LogInformation("Executing test query (SELECT 1)...");
        if (connection.State != System.Data.ConnectionState.Open)
        {
            connection.Open();
        }

        using (var command = connection.CreateCommand())
        {
            command.CommandText = "SELECT 1;";
            command.ExecuteScalar();
        }

        logger.LogInformation("Verifying database schema completeness (checking Users table)...");
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "SELECT OBJECT_ID('dbo.Users', 'U');";
            var result = command.ExecuteScalar();
            if (result == DBNull.Value || result == null)
            {
                logger.LogWarning("Database exists, but required tables are missing.");
                return false;
            }
        }

        return true;
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "An error occurred during startup database verification check.");
        return false;
    }
}
