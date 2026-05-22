using System.ComponentModel.DataAnnotations;

namespace TeamTaskManager.Api.DTOs;

public class TaskDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime DueDate { get; set; }
    public string Status { get; set; } = "ToDo"; // "ToDo", "InProgress", "Done"
    public string Priority { get; set; } = "Medium"; // "Low", "Medium", "High"
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public int? AssignedToUserId { get; set; }
    public string? AssignedToUserName { get; set; }
    public string? AssignedToUserEmail { get; set; }
    public int CreatedByUserId { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsOverdue => Status != "Done" && DueDate < DateTime.UtcNow;
}

public class CreateTaskRequest
{
    [Required(ErrorMessage = "Title is required")]
    [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
    public string Title { get; set; } = string.Empty;

    [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "DueDate is required")]
    public DateTime DueDate { get; set; }

    [Required(ErrorMessage = "Status is required")]
    [RegularExpression("^(ToDo|InProgress|Done)$", ErrorMessage = "Status must be 'ToDo', 'InProgress', or 'Done'")]
    public string Status { get; set; } = "ToDo";

    [Required(ErrorMessage = "Priority is required")]
    [RegularExpression("^(Low|Medium|High)$", ErrorMessage = "Priority must be 'Low', 'Medium', or 'High'")]
    public string Priority { get; set; } = "Medium";

    [Required(ErrorMessage = "ProjectId is required")]
    public int ProjectId { get; set; }

    public int? AssignedToUserId { get; set; }
}

public class UpdateTaskRequest
{
    [Required(ErrorMessage = "Title is required")]
    [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
    public string Title { get; set; } = string.Empty;

    [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "DueDate is required")]
    public DateTime DueDate { get; set; }

    [Required(ErrorMessage = "Status is required")]
    [RegularExpression("^(ToDo|InProgress|Done)$", ErrorMessage = "Status must be 'ToDo', 'InProgress', or 'Done'")]
    public string Status { get; set; } = "ToDo";

    [Required(ErrorMessage = "Priority is required")]
    [RegularExpression("^(Low|Medium|High)$", ErrorMessage = "Priority must be 'Low', 'Medium', or 'High'")]
    public string Priority { get; set; } = "Medium";

    public int? AssignedToUserId { get; set; }
}

public class UpdateTaskStatusRequest
{
    [Required(ErrorMessage = "Status is required")]
    [RegularExpression("^(ToDo|InProgress|Done)$", ErrorMessage = "Status must be 'ToDo', 'InProgress', or 'Done'")]
    public string Status { get; set; } = "ToDo";
}

public class AssignTaskRequest
{
    public int? AssignedToUserId { get; set; }
}

public class TaskDashboardDto
{
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int OverdueTasks { get; set; }
    public double CompletionRate => TotalTasks == 0 ? 0 : Math.Round((double)CompletedTasks / TotalTasks * 100, 1);
    
    public List<MetricGroupDto> StatusMetrics { get; set; } = new();
    public List<MetricGroupDto> PriorityMetrics { get; set; } = new();
    public List<TaskDto> RecentActivity { get; set; } = new();
    public List<TaskDto> OverdueTaskList { get; set; } = new();
}

public class MetricGroupDto
{
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percentage { get; set; }
}
