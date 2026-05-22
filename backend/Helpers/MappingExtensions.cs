using TeamTaskManager.Api.Entities;
using TeamTaskManager.Api.DTOs;

namespace TeamTaskManager.Api.Helpers;

public static class MappingExtensions
{
    public static UserDto ToDto(this User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            CreatedAt = user.CreatedAt
        };
    }

    public static ProjectDto ToDto(this Project project)
    {
        return new ProjectDto
        {
            Id = project.Id,
            Name = project.Name,
            Description = project.Description,
            CreatedByUserId = project.CreatedByUserId,
            CreatedByUserName = project.CreatedByUser?.Name ?? "Unknown Creator",
            CreatedAt = project.CreatedAt,
            Members = project.Members.Select(m => m.ToDto()).ToList()
        };
    }

    public static ProjectMemberDto ToDto(this ProjectMember member)
    {
        return new ProjectMemberDto
        {
            UserId = member.UserId,
            UserName = member.User?.Name ?? "Unknown User",
            UserEmail = member.User?.Email ?? string.Empty,
            Role = member.Role,
            JoinedAt = member.JoinedAt
        };
    }

    public static TaskDto ToDto(this TaskItem task)
    {
        return new TaskDto
        {
            Id = task.Id,
            Title = task.Title,
            Description = task.Description,
            DueDate = task.DueDate,
            Status = task.Status,
            Priority = task.Priority,
            ProjectId = task.ProjectId,
            ProjectName = task.Project?.Name ?? "Unknown Project",
            AssignedToUserId = task.AssignedToUserId,
            AssignedToUserName = task.AssignedToUser?.Name,
            AssignedToUserEmail = task.AssignedToUser?.Email,
            CreatedByUserId = task.CreatedByUserId,
            CreatedByUserName = task.CreatedByUser?.Name ?? "Unknown Creator",
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt
        };
    }
}
