variable "region" {
  description = "AWS region for the primary deployment"
  type        = string
  default     = "eu-west-1" # closest region with good latency to West Africa; revisit if most traffic is Nigeria-based
}

variable "environment" {
  type    = string
  default = "production"
}

variable "gateway_instance_count" {
  description = "Number of gateway replicas per AZ for HA"
  type        = number
  default     = 2
}

variable "db_instance_class" {
  type    = string
  default = "db.r6g.large"
}
