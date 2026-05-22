-- ===================================================
-- TEAM TASK MANAGER DATABASE SCHEMA & SEED SCRIPT
-- ===================================================

USE master;
GO

-- Safe database creation if it does not exist
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'TeamTaskManagerDb')
BEGIN
    CREATE DATABASE [TeamTaskManagerDb];
END
GO

USE [TeamTaskManagerDb];
GO

-- Set up transaction safety and rollback handling
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    -- 1. Create Users table idempotently
    IF OBJECT_ID('dbo.Users', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.Users (
            Id INT IDENTITY(1,1) NOT NULL,
            Name NVARCHAR(100) NOT NULL,
            Email NVARCHAR(256) NOT NULL,
            PasswordHash NVARCHAR(500) NOT NULL,
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (Id),
            CONSTRAINT UQ_Users_Email UNIQUE (Email)
        );
    END

    -- 2. Create Projects table idempotently
    IF OBJECT_ID('dbo.Projects', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.Projects (
            Id INT IDENTITY(1,1) NOT NULL,
            Name NVARCHAR(150) NOT NULL,
            Description NVARCHAR(1000) NULL,
            CreatedByUserId INT NOT NULL,
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            CONSTRAINT PK_Projects PRIMARY KEY CLUSTERED (Id),
            CONSTRAINT FK_Projects_Users_CreatedBy FOREIGN KEY (CreatedByUserId) 
                REFERENCES dbo.Users (Id) ON DELETE NO ACTION
        );
    END

    -- 3. Create ProjectMembers table idempotently
    IF OBJECT_ID('dbo.ProjectMembers', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.ProjectMembers (
            ProjectId INT NOT NULL,
            UserId INT NOT NULL,
            Role NVARCHAR(50) NOT NULL, -- 'Admin', 'Member'
            JoinedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            CONSTRAINT PK_ProjectMembers PRIMARY KEY CLUSTERED (ProjectId, UserId),
            CONSTRAINT FK_ProjectMembers_Projects FOREIGN KEY (ProjectId) 
                REFERENCES dbo.Projects (Id) ON DELETE CASCADE,
            CONSTRAINT FK_ProjectMembers_Users FOREIGN KEY (UserId) 
                REFERENCES dbo.Users (Id) ON DELETE NO ACTION
        );
    END

    -- 4. Create Tasks table idempotently
    IF OBJECT_ID('dbo.Tasks', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.Tasks (
            Id INT IDENTITY(1,1) NOT NULL,
            Title NVARCHAR(200) NOT NULL,
            Description NVARCHAR(2000) NULL,
            DueDate DATETIME2 NOT NULL,
            Status NVARCHAR(50) NOT NULL DEFAULT 'ToDo', -- 'ToDo', 'InProgress', 'Done'
            Priority NVARCHAR(50) NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High'
            ProjectId INT NOT NULL,
            AssignedToUserId INT NULL,
            CreatedByUserId INT NOT NULL,
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            CONSTRAINT PK_Tasks PRIMARY KEY CLUSTERED (Id),
            CONSTRAINT FK_Tasks_Projects FOREIGN KEY (ProjectId) 
                REFERENCES dbo.Projects (Id) ON DELETE CASCADE,
            CONSTRAINT FK_Tasks_Users_AssignedTo FOREIGN KEY (AssignedToUserId) 
                REFERENCES dbo.Users (Id) ON DELETE SET NULL,
            CONSTRAINT FK_Tasks_Users_CreatedBy FOREIGN KEY (CreatedByUserId) 
                REFERENCES dbo.Users (Id) ON DELETE NO ACTION
        );
    END

    -- 5. Create Indexes idempotently
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'IX_Users_Email')
        CREATE NONCLUSTERED INDEX IX_Users_Email ON dbo.Users(Email);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Projects') AND name = 'IX_Projects_CreatedByUserId')
        CREATE NONCLUSTERED INDEX IX_Projects_CreatedByUserId ON dbo.Projects(CreatedByUserId);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.ProjectMembers') AND name = 'IX_ProjectMembers_UserId')
        CREATE NONCLUSTERED INDEX IX_ProjectMembers_UserId ON dbo.ProjectMembers(UserId);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Tasks') AND name = 'IX_Tasks_ProjectId')
        CREATE NONCLUSTERED INDEX IX_Tasks_ProjectId ON dbo.Tasks(ProjectId);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Tasks') AND name = 'IX_Tasks_AssignedToUserId')
        CREATE NONCLUSTERED INDEX IX_Tasks_AssignedToUserId ON dbo.Tasks(AssignedToUserId);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Tasks') AND name = 'IX_Tasks_Status')
        CREATE NONCLUSTERED INDEX IX_Tasks_Status ON dbo.Tasks(Status);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Tasks') AND name = 'IX_Tasks_DueDate')
        CREATE NONCLUSTERED INDEX IX_Tasks_DueDate ON dbo.Tasks(DueDate);

    -- ===================================================
    -- 6. RESET DATA PROFILE AND TRANSACTION-SAFE RE-SEED
    -- ===================================================
    PRINT 'Resetting existing data to perform clean seed operation...';
    
    -- Clear dependent table contents first to respect FK constraints
    DELETE FROM dbo.Tasks;
    DELETE FROM dbo.ProjectMembers;
    DELETE FROM dbo.Projects;
    DELETE FROM dbo.Users;

    -- Reseed auto-incrementing identity columns
    DBCC CHECKIDENT ('dbo.Users', RESEED, 0);
    DBCC CHECKIDENT ('dbo.Projects', RESEED, 0);
    DBCC CHECKIDENT ('dbo.Tasks', RESEED, 0);

    PRINT 'Injecting production-grade test seed data...';

    -- Seed operational users (Default passwords correspond strictly to the plaintext 'Password123!')
    -- verified BCrypt hash: $2a$11$8PzR6X8U4N8Z0d9x9D1Y.emM.l9rE4L/s6Pj9fT5zHqV0d8p9lRmu
    INSERT INTO dbo.Users (Name, Email, PasswordHash, CreatedAt) VALUES
    (N'Punit Shukla', N'punit@taskmanager.com', N'$2a$11$8PzR6X8U4N8Z0d9x9D1Y.emM.l9rE4L/s6Pj9fT5zHqV0d8p9lRmu', GETUTCDATE()),
    (N'John Doe', N'john@taskmanager.com', N'$2a$11$8PzR6X8U4N8Z0d9x9D1Y.emM.l9rE4L/s6Pj9fT5zHqV0d8p9lRmu', GETUTCDATE()),
    (N'Jane Smith', N'jane@taskmanager.com', N'$2a$11$8PzR6X8U4N8Z0d9x9D1Y.emM.l9rE4L/s6Pj9fT5zHqV0d8p9lRmu', GETUTCDATE());

    -- Retrieve safe scoped identities for references
    DECLARE @PunitId INT = (SELECT Id FROM dbo.Users WHERE Email = N'punit@taskmanager.com');
    DECLARE @JohnId INT = (SELECT Id FROM dbo.Users WHERE Email = N'john@taskmanager.com');
    DECLARE @JaneId INT = (SELECT Id FROM dbo.Users WHERE Email = N'jane@taskmanager.com');

    -- Seed Projects
    INSERT INTO dbo.Projects (Name, Description, CreatedByUserId, CreatedAt) VALUES
    (N'Website Redesign', N'Modernize the company homepage with obsidian aesthetics and neon elements.', @PunitId, GETUTCDATE()),
    (N'Mobile App Development', N'Develop cross-platform Flutter mobile client for users to view tasks on the go.', @JohnId, GETUTCDATE());

    -- Retrieve project IDs
    DECLARE @WebsiteProjId INT = (SELECT Id FROM dbo.Projects WHERE Name = N'Website Redesign');
    DECLARE @MobileProjId INT = (SELECT Id FROM dbo.Projects WHERE Name = N'Mobile App Development');

    -- Seed Project Members
    INSERT INTO dbo.ProjectMembers (ProjectId, UserId, Role, JoinedAt) VALUES 
    (@WebsiteProjId, @PunitId, N'Admin', GETUTCDATE()),
    (@WebsiteProjId, @JohnId, N'Member', GETUTCDATE()),
    (@WebsiteProjId, @JaneId, N'Member', GETUTCDATE()),
    (@MobileProjId, @JohnId, N'Admin', GETUTCDATE()),
    (@MobileProjId, @JaneId, N'Member', GETUTCDATE());

    -- Seed Tasks (TaskItems)
    INSERT INTO dbo.Tasks (Title, Description, DueDate, Status, Priority, ProjectId, AssignedToUserId, CreatedByUserId, CreatedAt, UpdatedAt) VALUES
    (N'Design Figma Mockups', N'Create modern high-fidelity volcanic red UI prototypes.', DATEADD(day, 2, GETUTCDATE()), N'InProgress', N'High', @WebsiteProjId, @JaneId, @PunitId, GETUTCDATE(), GETUTCDATE()),
    (N'Setup .NET 8 API skeleton', N'Bootstrap web API project structure and write DB context.', DATEADD(day, -1, GETUTCDATE()), N'Done', N'Medium', @WebsiteProjId, @JohnId, @PunitId, GETUTCDATE(), GETUTCDATE()),
    (N'Configure JWT Security', N'Setup authentication middleware and secure endpoints with role authorizations.', DATEADD(day, 5, GETUTCDATE()), N'ToDo', N'High', @WebsiteProjId, @PunitId, @PunitId, GETUTCDATE(), GETUTCDATE()),
    (N'Create Flutter Repository', N'Initialize mobile app project and setup pipelines.', DATEADD(day, 7, GETUTCDATE()), N'ToDo', N'Low', @MobileProjId, @JohnId, @JohnId, GETUTCDATE(), GETUTCDATE()),
    (N'Write API Client Library', N'Integrate auth and endpoints on mobile client.', DATEADD(day, -2, GETUTCDATE()), N'ToDo', N'High', @MobileProjId, @JaneId, @JohnId, GETUTCDATE(), GETUTCDATE());

    COMMIT TRANSACTION;
    PRINT 'Database schema configured and operational data seeded successfully with transaction safety.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
    BEGIN
        ROLLBACK TRANSACTION;
    END

    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();

    RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH
GO
SELECT * FROM Users;