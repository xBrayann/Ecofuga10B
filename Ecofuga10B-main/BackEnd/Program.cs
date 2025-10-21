using BackEnd.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddSingleton<FirebaseService>(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    return new FirebaseService(configuration);
});


builder.Services.AddScoped<IEmailService, EmailService>();


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalhost5500", policy =>
    {
        policy.WithOrigins("http://127.0.0.1:5500") 
                .AllowAnyHeader()
                .AllowAnyMethod();
    });
});

var app = builder.Build();


if (app.Environment.IsDevelopment())
{

}

app.UseHttpsRedirection();


app.UseCors("AllowLocalhost5500");

app.UseAuthorization();

app.MapControllers();

app.Run();
