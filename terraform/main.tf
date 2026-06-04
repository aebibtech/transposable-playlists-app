terraform {
  required_version = ">= 1.6.0"

  backend "gcs" {
    bucket = "tf-state-transposable-playlists"
    prefix = "terraform/state"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "vercel" {
  api_token = var.vercel_api_token
}
