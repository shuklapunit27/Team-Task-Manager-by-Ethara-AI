using TeamTaskManager.Api.Entities;

namespace TeamTaskManager.Api.Interfaces;

public interface ITokenService
{
    string GenerateToken(User user);
}
