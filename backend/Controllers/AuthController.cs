using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamTaskManager.Api.Data;
using TeamTaskManager.Api.DTOs;
using TeamTaskManager.Api.Entities;
using TeamTaskManager.Api.Helpers;
using TeamTaskManager.Api.Interfaces;

namespace TeamTaskManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;

    public AuthController(
        ApplicationDbContext context, 
        IPasswordHasher passwordHasher, 
        ITokenService tokenService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email, cancellationToken))
        {
            return BadRequest(ApiResponse<AuthResponse>.FailureResponse("Email address is already in use."));
        }

        var user = new User
        {
            Name = request.Name,
            Email = request.Email,
            PasswordHash = _passwordHasher.HashPassword(request.Password)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        var token = _tokenService.GenerateToken(user);
        var authResponse = new AuthResponse
        {
            Token = token,
            User = user.ToDto()
        };

        return Ok(ApiResponse<AuthResponse>.SuccessResponse(authResponse, "Registration successful."));
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);
        
        // Evaluate credentials directly via BCrypt's Verify method for robust cryptographically secure validation
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            // Gracefully handle credential checkpoints with standard ApiResponse contract wrapper and 401 Unauthorized status
            return Unauthorized(ApiResponse<AuthResponse>.FailureResponse("Invalid credentials provided."));
        }

        var token = _tokenService.GenerateToken(user);
        var authResponse = new AuthResponse
        {
            Token = token,
            User = user.ToDto()
        };

        return Ok(ApiResponse<AuthResponse>.SuccessResponse(authResponse, "Login successful."));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<UserDto>>> Me(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(ApiResponse<UserDto>.FailureResponse("Invalid authorization claims."));
        }

        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null)
        {
            return NotFound(ApiResponse<UserDto>.FailureResponse("User not found."));
        }

        return Ok(ApiResponse<UserDto>.SuccessResponse(user.ToDto(), "Current user details retrieved."));
    }

    [Authorize]
    [HttpGet("users")]
    public async Task<ActionResult<ApiResponse<List<UserResponse>>>> GetUsers(CancellationToken cancellationToken)
    {
        var users = await _context.Users
            .Select(u => new UserResponse
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<List<UserResponse>>.SuccessResponse(users, "All registered users retrieved successfully."));
    }
}
