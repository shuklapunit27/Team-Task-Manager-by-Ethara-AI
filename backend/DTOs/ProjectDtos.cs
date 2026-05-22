using System.ComponentModel.DataAnnotations;

namespace TeamTaskManager.Api.DTOs;

public class ProjectDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int CreatedByUserId { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<ProjectMemberDto> Members { get; set; } = new();
}

public class ProjectMemberDto
{
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string Role { get; set; } = "Member"; // "Admin", "Member"
    public DateTime JoinedAt { get; set; }
}

public class CreateProjectRequest
{
    [Required(ErrorMessage = "Project name is required")]
    [StringLength(150, ErrorMessage = "Project name cannot exceed 150 characters")]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string? Description { get; set; }
}

public class UpdateProjectRequest
{
    [Required(ErrorMessage = "Project name is required")]
    [StringLength(150, ErrorMessage = "Project name cannot exceed 150 characters")]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string? Description { get; set; }
}

public class AddMemberRequest
{
    [Required(ErrorMessage = "User email is required")]
    [EmailAddress(ErrorMessage = "Invalid email address format")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Role is required")]
    [RegularExpression("^(Admin|Member)$", ErrorMessage = "Role must be either 'Admin' or 'Member'")]
    public string Role { get; set; } = "Member";
}

public class UpdateMemberRoleRequest
{
    [Required(ErrorMessage = "Role is required")]
    [RegularExpression("^(Admin|Member)$", ErrorMessage = "Role must be either 'Admin' or 'Member'")]
    public string Role { get; set; } = "Member";
}
