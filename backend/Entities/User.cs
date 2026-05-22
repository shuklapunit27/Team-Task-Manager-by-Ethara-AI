using System.Text.Json.Serialization;

namespace TeamTaskManager.Api.Entities;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    
    [JsonIgnore]
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [JsonIgnore]
    public ICollection<Project> CreatedProjects { get; set; } = new List<Project>();
    
    [JsonIgnore]
    public ICollection<ProjectMember> ProjectMemberships { get; set; } = new List<ProjectMember>();
    
    [JsonIgnore]
    public ICollection<TaskItem> AssignedTasks { get; set; } = new List<TaskItem>();
    
    [JsonIgnore]
    public ICollection<TaskItem> CreatedTasks { get; set; } = new List<TaskItem>();
}
