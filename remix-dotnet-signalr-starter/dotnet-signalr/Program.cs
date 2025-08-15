using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .SetIsOriginAllowed(origin => true); // dev only
    });
});

var app = builder.Build();

app.UseCors();

app.MapGet("/api/health", () => Results.Ok(new { ok = true, time = DateTimeOffset.UtcNow }));

app.MapHub<ChatHub>("/chathub");

app.Run();

public class ChatHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, $"{message} - processed via SignalR connection: {Context.ConnectionId}");
    }
}
