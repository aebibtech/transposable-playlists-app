resource "vercel_project" "frontend" {
  name      = var.project_name
  framework = "vite"
  team_id   = var.vercel_team_id

  git_repository = {
    type = "github"
    repo = "aebibtech/transposable-playlists-app" # Note: User should update this
  }

  environment = [
    {
      key   = "VITE_SUPABASE_URL"
      value = var.supabase_url
      target = ["production", "preview", "development"]
    },
    {
      key   = "VITE_SUPABASE_KEY"
      value = var.supabase_anon_key
      target = ["production", "preview", "development"]
    },
    {
      key   = "VITE_PROXY_URL"
      value = google_cloud_run_v2_service.proxy.uri
      target = ["production", "preview", "development"]
    }
  ]
}

# output "vercel_url" {
#   value = vercel_project.frontend.primary_domain
# }
