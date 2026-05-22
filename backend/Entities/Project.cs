using System.Text.Json.Serialization;

namespace TeamTaskManager.Api.Entities;

public class Project
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User? CreatedByUser { get; set; }
    
    [JsonIgnore]
    public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
    
    [JsonIgnore]
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
