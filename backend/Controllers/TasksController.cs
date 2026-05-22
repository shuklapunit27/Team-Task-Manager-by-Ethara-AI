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
public class TasksController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public TasksController(ApplicationDbContext context)
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

    private async System.Threading.Tasks.Task<bool> IsProjectMemberAsync(int projectId, int userId, CancellationToken cancellationToken)
    {
        var project = await _context.Projects.FindAsync(new object[] { projectId }, cancellationToken);
        if (project == null) return false;
        if (project.CreatedByUserId == userId) return true;

        return await _context.ProjectMembers
            .AnyAsync(m => m.ProjectId == projectId && m.UserId == userId, cancellationToken);
    }

    /// <summary>
    /// Returns true if the user is the project creator OR has the 'Admin' role in ProjectMembers.
    /// Used to gate task deletion and other admin-only operations.
    /// </summary>
    private async System.Threading.Tasks.Task<bool> IsProjectAdminAsync(int projectId, int userId, CancellationToken cancellationToken)
    {
        var project = await _context.Projects.FindAsync(new object[] { projectId }, cancellationToken);
        if (project == null) return false;
        if (project.CreatedByUserId == userId) return true;

        var member = await _context.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId, cancellationToken);
        return member != null && member.Role == "Admin";
    }

    [HttpGet]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<List<TaskDto>>>> GetTasks([FromQuery] int? projectId, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        IQueryable<TaskItem> query = _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser);

        if (projectId.HasValue)
        {
            if (!await IsProjectMemberAsync(projectId.Value, userId, cancellationToken))
            {
                return Forbid();
            }
            query = query.Where(t => t.ProjectId == projectId.Value);
        }
        else
        {
            // Only tasks from projects user is member of
            query = query.Where(t => t.Project!.CreatedByUserId == userId || t.Project.Members.Any(m => m.UserId == userId));
        }

        var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync(cancellationToken);
        var dtos = tasks.Select(t => t.ToDto()).ToList();
        return Ok(ApiResponse<List<TaskDto>>.SuccessResponse(dtos, "Tasks fetched successfully."));
    }

    [HttpGet("{id}")]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<TaskDto>>> GetTaskById(int id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var task = await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (task == null)
        {
            return NotFound(ApiResponse<TaskDto>.FailureResponse("Task not found."));
        }

        if (!await IsProjectMemberAsync(task.ProjectId, userId, cancellationToken))
        {
            return Forbid();
        }

        return Ok(ApiResponse<TaskDto>.SuccessResponse(task.ToDto(), "Task details retrieved."));
    }

    [HttpPost]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<TaskDto>>> CreateTask([FromBody] CreateTaskRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!await IsProjectMemberAsync(request.ProjectId, userId, cancellationToken))
        {
            return Forbid();
        }

        // Verify assignee exists in database if provided
        if (request.AssignedToUserId.HasValue)
        {
            var assigneeExists = await _context.Users.AnyAsync(u => u.Id == request.AssignedToUserId.Value, cancellationToken);
            if (!assigneeExists)
            {
                return BadRequest(ApiResponse<TaskDto>.FailureResponse("Assigned user does not exist in the database."));
            }
        }

        var task = new TaskItem
        {
            Title = request.Title,
            Description = request.Description,
            DueDate = request.DueDate.ToUniversalTime(),
            Status = request.Status,
            Priority = request.Priority,
            ProjectId = request.ProjectId,
            AssignedToUserId = request.AssignedToUserId,
            CreatedByUserId = userId
        };

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync(cancellationToken);

        var hydratedTask = await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .FirstAsync(t => t.Id == task.Id, cancellationToken);

        return CreatedAtAction(nameof(GetTaskById), new { id = task.Id },
            ApiResponse<TaskDto>.SuccessResponse(hydratedTask.ToDto(), "Task created successfully."));
    }

    [HttpPut("{id}")]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<TaskDto>>> UpdateTask(int id, [FromBody] UpdateTaskRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var task = await _context.Tasks.FindAsync(new object[] { id }, cancellationToken);
        if (task == null)
        {
            return NotFound(ApiResponse<TaskDto>.FailureResponse("Task not found."));
        }

        if (!await IsProjectMemberAsync(task.ProjectId, userId, cancellationToken))
        {
            return Forbid();
        }

        // Verify assignee exists in database if provided
        if (request.AssignedToUserId.HasValue)
        {
            var assigneeExists = await _context.Users.AnyAsync(u => u.Id == request.AssignedToUserId.Value, cancellationToken);
            if (!assigneeExists)
            {
                return BadRequest(ApiResponse<TaskDto>.FailureResponse("Assigned user does not exist in the database."));
            }
        }

        task.Title = request.Title;
        task.Description = request.Description;
        task.DueDate = request.DueDate.ToUniversalTime();
        task.Status = request.Status;
        task.Priority = request.Priority;
        task.AssignedToUserId = request.AssignedToUserId;
        task.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var hydratedTask = await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .FirstAsync(t => t.Id == id, cancellationToken);

        return Ok(ApiResponse<TaskDto>.SuccessResponse(hydratedTask.ToDto(), "Task updated successfully."));
    }

    [HttpDelete("{id}")]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<object>>> DeleteTask(int id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        // Load the task with Project included so we know which project to check membership against
        var task = await _context.Tasks
            .Include(t => t.Project)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (task == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Task not found."));
        }

        // Gate 1: Caller must be a project member before we reveal existence of the task
        if (!await IsProjectMemberAsync(task.ProjectId, userId, cancellationToken))
        {
            return Forbid();
        }

        // Gate 2: Only project Admins (creator or explicit Admin role) can delete tasks
        if (!await IsProjectAdminAsync(task.ProjectId, userId, cancellationToken))
        {
            return StatusCode(403, ApiResponse<object>.FailureResponse("Only project administrators can delete tasks."));
        }

        // Gate 3: Deletion is restricted to tasks that have reached 'Done' status
        if (task.Status != "Done")
        {
            return BadRequest(ApiResponse<object>.FailureResponse("Only completed tasks in 'Done' status can be deleted."));
        }

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Task deleted successfully."));
    }

    [HttpPut("{id}/status")]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<TaskDto>>> UpdateStatus(int id, [FromBody] UpdateTaskStatusRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var task = await _context.Tasks.FindAsync(new object[] { id }, cancellationToken);
        if (task == null)
        {
            return NotFound(ApiResponse<TaskDto>.FailureResponse("Task not found."));
        }

        if (!await IsProjectMemberAsync(task.ProjectId, userId, cancellationToken))
        {
            return Forbid();
        }

        task.Status = request.Status;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        var hydratedTask = await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .FirstAsync(t => t.Id == id, cancellationToken);

        return Ok(ApiResponse<TaskDto>.SuccessResponse(hydratedTask.ToDto(), $"Task status updated to {request.Status}."));
    }

    [HttpPut("{id}/assign")]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<TaskDto>>> AssignTask(int id, [FromBody] AssignTaskRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var task = await _context.Tasks.FindAsync(new object[] { id }, cancellationToken);
        if (task == null)
        {
            return NotFound(ApiResponse<TaskDto>.FailureResponse("Task not found."));
        }

        if (!await IsProjectMemberAsync(task.ProjectId, userId, cancellationToken))
        {
            return Forbid();
        }

        if (request.AssignedToUserId.HasValue)
        {
            var assigneeExists = await _context.Users.AnyAsync(u => u.Id == request.AssignedToUserId.Value, cancellationToken);
            if (!assigneeExists)
            {
                return BadRequest(ApiResponse<TaskDto>.FailureResponse("Assigned user does not exist in the database."));
            }
        }

        task.AssignedToUserId = request.AssignedToUserId;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        var hydratedTask = await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .FirstAsync(t => t.Id == id, cancellationToken);

        var memberName = hydratedTask.AssignedToUser?.Name ?? "Unassigned";
        return Ok(ApiResponse<TaskDto>.SuccessResponse(hydratedTask.ToDto(), $"Task assigned to {memberName}."));
    }

    [HttpGet("overdue")]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<List<TaskDto>>>> GetOverdueTasks(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var now = DateTime.UtcNow;

        var overdueTasks = await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .Where(t => (t.Project!.CreatedByUserId == userId || t.Project.Members.Any(m => m.UserId == userId))
                        && t.Status != "Done"
                        && t.DueDate < now)
            .OrderBy(t => t.DueDate)
            .ToListAsync(cancellationToken);

        var dtos = overdueTasks.Select(t => t.ToDto()).ToList();
        return Ok(ApiResponse<List<TaskDto>>.SuccessResponse(dtos, "Overdue tasks retrieved."));
    }

    [HttpGet("dashboard")]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<TaskDashboardDto>>> GetDashboardAnalytics(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var now = DateTime.UtcNow;

        // Fetch all tasks matching user membership scope
        var tasks = await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .Where(t => t.Project!.CreatedByUserId == userId || t.Project.Members.Any(m => m.UserId == userId))
            .ToListAsync(cancellationToken);

        var total = tasks.Count;
        var completed = tasks.Count(t => t.Status == "Done");
        var overdue = tasks.Count(t => t.Status != "Done" && t.DueDate < now);

        // Group status
        var statusGroups = tasks.GroupBy(t => t.Status)
            .Select(g => new MetricGroupDto
            {
                Label = g.Key,
                Count = g.Count(),
                Percentage = total == 0 ? 0 : Math.Round((double)g.Count() / total * 100, 1)
            }).ToList();

        // Enforce all statuses appear even if 0
        var expectedStatuses = new[] { "ToDo", "InProgress", "Done" };
        foreach (var status in expectedStatuses)
        {
            if (!statusGroups.Any(s => s.Label == status))
            {
                statusGroups.Add(new MetricGroupDto { Label = status, Count = 0, Percentage = 0 });
            }
        }

        // Group priority
        var priorityGroups = tasks.GroupBy(t => t.Priority)
            .Select(g => new MetricGroupDto
            {
                Label = g.Key,
                Count = g.Count(),
                Percentage = total == 0 ? 0 : Math.Round((double)g.Count() / total * 100, 1)
            }).ToList();

        var expectedPriorities = new[] { "Low", "Medium", "High" };
        foreach (var priority in expectedPriorities)
        {
            if (!priorityGroups.Any(p => p.Label == priority))
            {
                priorityGroups.Add(new MetricGroupDto { Label = priority, Count = 0, Percentage = 0 });
            }
        }

        var recentActivity = tasks.OrderByDescending(t => t.UpdatedAt).Take(5).Select(t => t.ToDto()).ToList();
        var overdueTaskList = tasks.Where(t => t.Status != "Done" && t.DueDate < now)
            .OrderBy(t => t.DueDate).Take(5).Select(t => t.ToDto()).ToList();

        var dashboard = new TaskDashboardDto
        {
            TotalTasks = total,
            CompletedTasks = completed,
            OverdueTasks = overdue,
            StatusMetrics = statusGroups.OrderBy(s => Array.IndexOf(expectedStatuses, s.Label)).ToList(),
            PriorityMetrics = priorityGroups.OrderBy(p => Array.IndexOf(expectedPriorities, p.Label)).ToList(),
            RecentActivity = recentActivity,
            OverdueTaskList = overdueTaskList
        };

        return Ok(ApiResponse<TaskDashboardDto>.SuccessResponse(dashboard, "Dashboard analytics calculated successfully."));
    }
}
