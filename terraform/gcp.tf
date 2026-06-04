resource "google_artifact_registry_repository" "proxy_repo" {
  location      = var.gcp_region
  repository_id = "${var.project_name}-repo"
  description   = "Docker repository for the audio proxy"
  format        = "DOCKER"
}

resource "google_cloud_run_v2_service" "proxy" {
  name     = "${var.project_name}-proxy"
  location = var.gcp_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.proxy_repo.repository_id}/proxy:latest"
      
      ports {
        container_port = 3001
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "1024Mi"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

resource "google_cloud_run_v2_service_iam_member" "noauth" {
  location = google_cloud_run_v2_service.proxy.location
  name     = google_cloud_run_v2_service.proxy.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "proxy_url" {
  value = google_cloud_run_v2_service.proxy.uri
}
