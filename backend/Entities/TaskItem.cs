using System.Text.Json.Serialization;

namespace TeamTaskManager.Api.Entities;

public class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime DueDate { get; set; }
    public string Status { get; set; } = "ToDo"; // "ToDo", "InProgress", "Done"
    public string Priority { get; set; } = "Medium"; // "Low", "Medium", "High"
    public int ProjectId { get; set; }
    public int? AssignedToUserId { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Project? Project { get; set; }
    public User? AssignedToUser { get; set; }
    public User? CreatedByUser { get; set; }
}
