namespace TeamTaskManager.Api.Entities;

public class ProjectMember
{
    public int ProjectId { get; set; }
    public int UserId { get; set; }
    public string Role { get; set; } = "Member"; // "Admin" or "Member"
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Project? Project { get; set; }
    public User? User { get; set; }
}
