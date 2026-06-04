variable "gcp_project_id" {
  description = "The ID of the Google Cloud project"
  type        = string
}

variable "gcp_region" {
  description = "The region to deploy GCP resources"
  type        = string
  default     = "asia-southeast1"
}

variable "vercel_api_token" {
  description = "Vercel API Token"
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel Team ID"
  type        = string
  default     = null
}

variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "transposable-playlists"
}

variable "supabase_url" {
  description = "Supabase Project URL"
  type        = string
}

variable "supabase_anon_key" {
  description = "Supabase Anon Key"
  type        = string
  sensitive   = true
}
