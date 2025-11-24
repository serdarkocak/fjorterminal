# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy source
COPY . .

# Restore and publish
RUN dotnet restore src/FjorTerminal.API/FjorTerminal.API.csproj \
 && dotnet publish src/FjorTerminal.API/FjorTerminal.API.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "FjorTerminal.API.dll"]
