using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamTaskManager.Api.Data;
using TeamTaskManager.Api.DTOs;
using TeamTaskManager.Api.Entities;
using TeamTaskManager.Api.Helpers;

namespace TeamTaskManager.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ProjectsController(ApplicationDbContext context)
    {
        _context = context;
    }

    private int GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(idClaim) && int.TryParse(idClaim, out var id))
        {
            return id;
        }
        throw new UnauthorizedAccessException("Invalid user identity in token.");
    }

    private async Task<bool> IsProjectAdminAsync(int projectId, int userId, CancellationToken cancellationToken)
    {
        var project = await _context.Projects.FindAsync(new object[] { projectId }, cancellationToken);
        if (project == null) return false;
        if (project.CreatedByUserId == userId) return true;

        var member = await _context.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId, cancellationToken);
        return member != null && member.Role == "Admin";
    }

    private async Task<bool> IsProjectMemberAsync(int projectId, int userId, CancellationToken cancellationToken)
    {
        var project = await _context.Projects.FindAsync(new object[] { projectId }, cancellationToken);
        if (project == null) return false;
        if (project.CreatedByUserId == userId) return true;

        return await _context.ProjectMembers
            .AnyAsync(m => m.ProjectId == projectId && m.UserId == userId, cancellationToken);
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProjectDto>>>> GetProjects(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        // Get projects created by user OR where user is a member
        var projects = await _context.Projects
            .Include(p => p.CreatedByUser)
            .Include(p => p.Members)
                .ThenInclude(m => m.User)
            .Where(p => p.CreatedByUserId == userId || p.Members.Any(m => m.UserId == userId))
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        var dtos = projects.Select(p => p.ToDto()).ToList();
        return Ok(ApiResponse<List<ProjectDto>>.SuccessResponse(dtos, "Projects fetched successfully."));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> GetProjectById(int id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!await IsProjectMemberAsync(id, userId, cancellationToken))
        {
            return Forbid();
        }

        var project = await _context.Projects
            .Include(p => p.CreatedByUser)
            .Include(p => p.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (project == null)
        {
            return NotFound(ApiResponse<ProjectDto>.FailureResponse("Project not found."));
        }

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(project.ToDto(), "Project details retrieved."));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> CreateProject([FromBody] CreateProjectRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        var project = new Project
        {
            Name = request.Name,
            Description = request.Description,
            CreatedByUserId = userId
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync(cancellationToken);

        // Creator automatically becomes an Admin member to support database sync rules
        var member = new ProjectMember
        {
            ProjectId = project.Id,
            UserId = userId,
            Role = "Admin"
        };
        _context.ProjectMembers.Add(member);
        await _context.SaveChangesAsync(cancellationToken);

        // Fetch back hydrated
        var hydratedProject = await _context.Projects
            .Include(p => p.CreatedByUser)
            .Include(p => p.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(p => p.Id == project.Id, cancellationToken);

        return CreatedAtAction(nameof(GetProjectById), new { id = project.Id }, 
            ApiResponse<ProjectDto>.SuccessResponse(hydratedProject!.ToDto(), "Project created successfully."));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateProject(int id, [FromBody] UpdateProjectRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!await IsProjectAdminAsync(id, userId, cancellationToken))
        {
            return Forbid();
        }

        var project = await _context.Projects.FindAsync(new object[] { id }, cancellationToken);
        if (project == null)
        {
            return NotFound(ApiResponse<ProjectDto>.FailureResponse("Project not found."));
        }

        project.Name = request.Name;
        project.Description = request.Description;

        await _context.SaveChangesAsync(cancellationToken);

        var hydratedProject = await _context.Projects
            .Include(p => p.CreatedByUser)
            .Include(p => p.Members)
                .ThenInclude(m => m.User)
            .FirstAsync(p => p.Id == id, cancellationToken);

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(hydratedProject.ToDto(), "Project updated successfully."));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteProject(int id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var project = await _context.Projects.FindAsync(new object[] { id }, cancellationToken);
        if (project == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Project not found."));
        }

        // Only project creator can delete
        if (project.CreatedByUserId != userId)
        {
            return Forbid();
        }

        _context.Projects.Remove(project);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Project deleted successfully."));
    }

    /// <summary>
    /// GET api/projects/{id}/members
    /// Returns all members (Admin + Members) of the given project so the frontend
    /// can populate the assignee dropdown dynamically across all authenticated browsers.
    /// Sorted: Admins first, then alphabetically by name.
    /// </summary>
    [HttpGet("{id}/members")]
    public async Task<ActionResult<ApiResponse<List<ProjectMemberDto>>>> GetProjectMembers(int id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        // Only members of the project may retrieve the full member list
        if (!await IsProjectMemberAsync(id, userId, cancellationToken))
        {
            return Forbid();
        }

        var members = await _context.ProjectMembers
            .Include(pm => pm.User)
            .Where(pm => pm.ProjectId == id)
            .OrderBy(pm => pm.Role)          // "Admin" < "Member" alphabetically → Admins first
            .ThenBy(pm => pm.User!.Name)
            .ToListAsync(cancellationToken);

        var dtos = members.Select(m => m.ToDto()).ToList();
        return Ok(ApiResponse<List<ProjectMemberDto>>.SuccessResponse(dtos, "Project members retrieved successfully."));
    }

    [HttpPost("{id}/members")]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> AddMember(int id, [FromBody] AddMemberRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!await IsProjectAdminAsync(id, userId, cancellationToken))
        {
            return Forbid();
        }

        var project = await _context.Projects.FindAsync(new object[] { id }, cancellationToken);
        if (project == null)
        {
            return NotFound(ApiResponse<ProjectDto>.FailureResponse("Project not found."));
        }

        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);
        if (targetUser == null)
        {
            return BadRequest(ApiResponse<ProjectDto>.FailureResponse("User with this email address does not exist."));
        }

        var alreadyMember = await _context.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == id && pm.UserId == targetUser.Id, cancellationToken);
        if (alreadyMember)
        {
            return BadRequest(ApiResponse<ProjectDto>.FailureResponse("User is already a member of this project."));
        }

        // Use the role supplied in the request body (validated by [RegularExpression] to be 'Admin' or 'Member')
        var assignedRole = string.IsNullOrWhiteSpace(request.Role) ? "Member" : request.Role;

        var newMember = new ProjectMember
        {
            ProjectId = id,
            UserId = targetUser.Id,
            Role = assignedRole
        };

        _context.ProjectMembers.Add(newMember);
        await _context.SaveChangesAsync(cancellationToken);

        var hydratedProject = await _context.Projects
            .Include(p => p.CreatedByUser)
            .Include(p => p.Members)
                .ThenInclude(m => m.User)
            .FirstAsync(p => p.Id == id, cancellationToken);

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(hydratedProject.ToDto(), $"{targetUser.Name} added to project as {assignedRole}."));
    }

    [HttpDelete("{id}/members/{memberUserId}")]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> RemoveMember(int id, int memberUserId, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!await IsProjectAdminAsync(id, userId, cancellationToken))
        {
            return Forbid();
        }

        var project = await _context.Projects.FindAsync(new object[] { id }, cancellationToken);
        if (project == null)
        {
            return NotFound(ApiResponse<ProjectDto>.FailureResponse("Project not found."));
        }

        // Project creator cannot be removed from members list
        if (project.CreatedByUserId == memberUserId)
        {
            return BadRequest(ApiResponse<ProjectDto>.FailureResponse("Cannot remove the creator of the project."));
        }

        var membership = await _context.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == id && pm.UserId == memberUserId, cancellationToken);
        if (membership == null)
        {
            return NotFound(ApiResponse<ProjectDto>.FailureResponse("User is not a member of this project."));
        }

        _context.ProjectMembers.Remove(membership);
        
        // Unassign tasks in this project that were assigned to the removed member
        var userTasks = await _context.Tasks
            .Where(t => t.ProjectId == id && t.AssignedToUserId == memberUserId)
            .ToListAsync(cancellationToken);
        foreach (var task in userTasks)
        {
            task.AssignedToUserId = null;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var hydratedProject = await _context.Projects
            .Include(p => p.CreatedByUser)
            .Include(p => p.Members)
                .ThenInclude(m => m.User)
            .FirstAsync(p => p.Id == id, cancellationToken);

        return Ok(ApiResponse<ProjectDto>.SuccessResponse(hydratedProject.ToDto(), "Member removed from project successfully."));
    }

    /// <summary>
    /// PATCH api/projects/{id}/members/{memberUserId}/role
    /// Allows an Admin to promote or demote an existing project member's role.
    /// The project creator's role cannot be changed.
    /// </summary>
    [HttpPatch("{id}/members/{memberUserId}/role")]
    public async Task<ActionResult<ApiResponse<ProjectMemberDto>>> UpdateMemberRole(
        int id, int memberUserId, [FromBody] UpdateMemberRoleRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!await IsProjectAdminAsync(id, userId, cancellationToken))
        {
            return Forbid();
        }

        var project = await _context.Projects.FindAsync(new object[] { id }, cancellationToken);
        if (project == null)
        {
            return NotFound(ApiResponse<ProjectMemberDto>.FailureResponse("Project not found."));
        }

        // Cannot change the creator's role via this endpoint
        if (project.CreatedByUserId == memberUserId)
        {
            return BadRequest(ApiResponse<ProjectMemberDto>.FailureResponse("Cannot change the role of the project creator."));
        }

        var membership = await _context.ProjectMembers
            .Include(pm => pm.User)
            .FirstOrDefaultAsync(pm => pm.ProjectId == id && pm.UserId == memberUserId, cancellationToken);

        if (membership == null)
        {
            return NotFound(ApiResponse<ProjectMemberDto>.FailureResponse("User is not a member of this project."));
        }

        membership.Role = request.Role;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<ProjectMemberDto>.SuccessResponse(membership.ToDto(), $"Member role updated to {request.Role} successfully."));
    }
}
